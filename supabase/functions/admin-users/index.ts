/**
 * admin-users — create and delete admin accounts.
 *
 * This is the project's first Edge Function, and it exists for exactly one
 * reason: minting or deleting a row in `auth.users` needs the service-role
 * key, and that key can never be shipped to a browser. Everything else in
 * the panel is client → Postgres through RLS and should stay that way.
 *
 * It is NOT a way around RLS. The caller's JWT is verified, and the same
 * `has_permission('members:write')` that every policy calls decides whether
 * they may proceed — evaluated by the database, as that user, before the
 * service-role client is touched at all.
 *
 * Failures come back as { error: { code, message } } using the DataError
 * codes from packages/db/src/errors.js, so the panel branches on one set
 * whichever adapter it is running against.
 *
 * Deploy:  see README → Managing accounts.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Mirrors MIN_PASSWORD_LENGTH in packages/db/src/mockAdapter.js. */
const MIN_PASSWORD_LENGTH = 10

const CORS = {
  // The panel is on its own origin and authenticates with a bearer token,
  // never a cookie, so there is no cross-site request forgery surface to
  // narrow this against.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, code: string, message: string) {
  return json(status, { error: { code, message } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return fail(405, 'invalid', 'POST only.')

  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization) {
    return fail(401, 'not_authenticated', 'You are not signed in.')
  }

  // Runs as the caller: their JWT, the anon key, and RLS in force.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: userError } = await caller.auth.getUser()
  if (userError || !userData.user) {
    return fail(401, 'not_authenticated', 'You are not signed in.')
  }
  const actorId = userData.user.id

  // The same helper the policies call, evaluated by the database as this
  // user. A president who has since been demoted is refused here.
  const { data: permitted, error: permError } = await caller.rpc('has_permission', {
    perm: 'members:write',
  })
  if (permError) {
    return fail(500, 'invalid', permError.message)
  }
  if (!permitted) {
    return fail(403, 'forbidden', 'Your role does not allow: members:write.')
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail(400, 'invalid', 'Expected a JSON body.')
  }

  // Only from here on, and only for the auth.users write itself.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (body.action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const fullName = String(body.fullName ?? '').trim()
    const roleId = String(body.roleId ?? '')
    const password = String(body.password ?? '')

    if (!EMAIL_RE.test(email)) {
      return fail(400, 'invalid', 'That does not look like an email address.')
    }
    if (!fullName) {
      return fail(400, 'invalid', 'Give the new member a name.')
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(
        400,
        'invalid',
        `The temporary password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
      )
    }

    const { data: role } = await admin.from('roles').select('id').eq('id', roleId).maybeSingle()
    if (!role) return fail(400, 'invalid', 'Pick a role for the new member.')

    // email_confirm skips the confirmation mail, matching the seeding
    // script: these are staff accounts created by hand by someone who
    // already knows the person.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) {
      const duplicate = /already (been )?registered|already exists/i.test(createError.message)
      return fail(
        duplicate ? 409 : 400,
        duplicate ? 'conflict' : 'invalid',
        duplicate ? `${email} already has an account.` : createError.message,
      )
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .insert({ id: created.user.id, email, full_name: fullName, role_id: roleId })
      .select()
      .single()

    if (profileError) {
      // An auth user with no profile is a half-created account: they can
      // sign in, resolve no role, and land nowhere. Undo rather than leave
      // that behind.
      await admin.auth.admin.deleteUser(created.user.id)
      const duplicate = profileError.code === '23505'
      return fail(
        duplicate ? 409 : 400,
        duplicate ? 'conflict' : 'invalid',
        duplicate ? `${email} already has an account.` : profileError.message,
      )
    }

    return json(200, { member: profile })
  }

  if (body.action === 'delete') {
    const id = String(body.id ?? '')
    if (!id) return fail(400, 'invalid', 'Which account?')
    if (id === actorId) {
      return fail(403, 'forbidden', 'You cannot remove your own account.')
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!profile) return fail(404, 'not_found', 'No such member.')

    // profiles_admin_floor would refuse this anyway when the cascade lands,
    // but a failed deleteUser reports it as an opaque database error. Check
    // it here so the panel gets the sentence written for it.
    const { data: others } = await admin
      .from('profiles')
      .select('id, roles!inner(permissions)')
      .neq('id', id)

    // The roster is a dozen people at most, so this counts in JS rather than
    // leaning on PostgREST's filter syntax for an embedded array column.
    const remaining = (others ?? []).filter((row) => {
      const role = Array.isArray(row.roles) ? row.roles[0] : row.roles
      return role?.permissions?.includes('members:write')
    })

    if (remaining.length === 0) {
      return fail(
        409,
        'conflict',
        'Someone has to keep the ability to manage members. Give another member that role first.',
      )
    }

    // Cascades to profiles (and from there to author_id / uploaded_by /
    // submitted_by, all `on delete set null` — the blog and the archive
    // outlive the board).
    const { error: deleteError } = await admin.auth.admin.deleteUser(id)
    if (deleteError) return fail(400, 'invalid', deleteError.message)

    return json(200, { member: profile })
  }

  return fail(400, 'invalid', `Unknown action: ${String(body.action)}.`)
})
