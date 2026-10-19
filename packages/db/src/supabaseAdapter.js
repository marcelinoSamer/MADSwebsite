import { createClient } from '@supabase/supabase-js'
import { checkForm, missingAnswers } from './formRules.js'
import { checkRole, compareRoles } from './roleRules.js'
import { checkEvent, normaliseEvent, compareEvents } from './eventRules.js'
import { DataError, CODES } from './errors.js'

/**
 * The real backend.
 *
 * Postgres is snake_case, the apps are camelCase. That translation happens
 * here and nowhere else — no component should ever know which backend it is
 * talking to, or that `bodyMd` is `body_md` on the other side.
 *
 * Permission checks are NOT in this file. They are RLS policies in
 * supabase/migrations/0001_init.sql, derived from the same permission
 * strings as permissions.js. The mock enforces them in JS only because it
 * has no database; here the database refuses, and we translate its refusal
 * into the same DataError the mock throws.
 */

const ROW = {
  post: {
    toCamel: (r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      bodyMd: r.body_md,
      status: r.status,
      publishedAt: r.published_at,
      authorId: r.author_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }),
    toSnake: (p) => prune({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body_md: p.bodyMd,
      status: p.status,
    }),
  },
  course: {
    toCamel: (r) => ({ id: r.id, code: r.code, title: r.title, level: r.level }),
    toSnake: (c) => prune({ code: c.code, title: c.title, level: c.level }),
  },
  syllabus: {
    toCamel: (r) => ({
      id: r.id,
      courseId: r.course_id,
      term: r.term,
      year: r.year,
      fileName: r.file_name,
      filePath: r.file_path,
      uploadedBy: r.uploaded_by,
      createdAt: r.created_at,
    }),
  },
  subscriber: {
    toCamel: (r) => ({
      id: r.id,
      email: r.email,
      source: r.source,
      createdAt: r.created_at,
      unsubscribedAt: r.unsubscribed_at,
    }),
  },
  form: {
    toCamel: (r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      audience: r.audience,
      isOpen: r.is_open,
      fields: r.fields ?? [],
      createdAt: r.created_at,
    }),
    toSnake: (f) => prune({
      slug: f.slug,
      title: f.title,
      description: f.description,
      audience: f.audience,
      is_open: f.isOpen,
      fields: f.fields,
    }),
  },
  submission: {
    toCamel: (r) => ({
      id: r.id,
      formId: r.form_id,
      payload: r.payload ?? {},
      submittedBy: r.submitted_by,
      createdAt: r.created_at,
    }),
  },
  member: {
    toCamel: (r) => ({
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      roleId: r.role_id,
      isSuper: Boolean(r.is_super),
      createdAt: r.created_at,
    }),
    toSnake: (m) => prune({ full_name: m.fullName, role_id: m.roleId }),
  },
  role: {
    toCamel: (r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions ?? [],
    }),
    toSnake: (r) => prune({ name: r.name, description: r.description, permissions: r.permissions }),
  },
  event: {
    toCamel: (r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      date: r.date,
      endDate: r.end_date,
      // Postgres `time` comes back as HH:MM:SS; the apps use HH:MM.
      startTime: r.start_time ? r.start_time.slice(0, 5) : null,
      endTime: r.end_time ? r.end_time.slice(0, 5) : null,
      isPublic: r.is_public,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }),
    toSnake: (e) => prune({
      title: e.title,
      description: e.description,
      location: e.location,
      date: e.date,
      end_date: e.endDate,
      start_time: e.startTime,
      end_time: e.endTime,
      is_public: e.isPublic,
    }),
  },
}

/** Drop undefined keys so a partial patch does not null out columns. */
function prune(object) {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined))
}

/**
 * Translate a PostgREST/GoTrue error into the same DataError the mock
 * produces, so UI code branches on one set of codes.
 */
function toDataError(error, fallback = 'Something went wrong.') {
  if (!error) return null

  const message = error.message ?? fallback
  const code = error.code ?? ''

  // 42501 = insufficient_privilege: our publish trigger, or an RLS refusal
  // that reached the database. PGRST301 / 401 = no valid session.
  if (code === '42501' || /row-level security|not allow/i.test(message)) {
    return new DataError(CODES.FORBIDDEN, message)
  }
  if (code === 'PGRST301' || error.status === 401) {
    return new DataError(CODES.NOT_AUTHENTICATED, 'You are not signed in.')
  }
  // 23505 = unique_violation: a duplicate slug or course code.
  if (code === '23505') {
    return new DataError(CODES.CONFLICT, 'That already exists — pick a different slug or code.')
  }
  // 23503 = foreign_key_violation: deleting a course that still has syllabi.
  if (code === '23503') {
    return new DataError(CODES.CONFLICT, 'Something still references this. Remove those first.')
  }
  // 23514 = check_violation, raised by profiles_admin_floor when a change
  // would leave nobody able to manage members. Its message is written to be
  // shown as-is.
  if (code === '23514') {
    return new DataError(CODES.CONFLICT, message)
  }
  if (code === 'PGRST116') {
    return new DataError(CODES.NOT_FOUND, 'Not found.')
  }
  if (code === '22023') {
    return new DataError(CODES.INVALID, message)
  }
  return new DataError(CODES.INVALID, message)
}

export function createSupabaseAdapter({ url, anonKey } = {}) {
  if (!url || !anonKey) {
    throw new DataError(
      CODES.NOT_CONFIGURED,
      'Supabase needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  const sb = createClient(url, anonKey)

  /** Unwrap a PostgREST result, mapping rows and errors. */
  async function run(query, map) {
    const { data, error } = await query
    if (error) throw toDataError(error)
    if (Array.isArray(data)) return map ? data.map(map) : data
    return data && map ? map(data) : data
  }

  // --- Auth --------------------------------------------------------------

  /**
   * Resolve a Supabase session into the `{ user, role }` shape the apps use.
   * RLS lets a signed-in user read their own profile and the roles table, so
   * this works with the anon key and no special casing.
   */
  async function sessionView(session) {
    if (!session?.user) return null

    const { data, error } = await sb
      .from('profiles')
      .select('id, email, full_name, role_id, created_at, roles(id, name, description, permissions)')
      .eq('id', session.user.id)
      .single()

    if (error || !data) {
      // Authenticated but with no profile row — an account created outside
      // the seeding script. Treat as signed out rather than crashing every
      // permission check downstream.
      return null
    }

    return {
      user: ROW.member.toCamel(data),
      role: data.roles ? ROW.role.toCamel(data.roles) : null,
    }
  }

  const auth = {
    async signIn({ email, password }) {
      const { data, error } = await sb.auth.signInWithPassword({
        email: String(email).trim(),
        password,
      })
      if (error) {
        throw new DataError(
          CODES.NOT_AUTHENTICATED,
          'That email and password do not match an account.',
        )
      }
      return sessionView(data.session)
    },

    async signOut() {
      await sb.auth.signOut()
      return null
    },

    async getSession() {
      const { data } = await sb.auth.getSession()
      return sessionView(data.session)
    },

    onChange(fn) {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        // Resolving the profile is async; the provider only ever renders the
        // settled value, so awaiting here is fine.
        sessionView(session).then(fn)
      })
      return () => data.subscription.unsubscribe()
    },
  }

  // --- Resources ---------------------------------------------------------

  const posts = {
    list: ({ status } = {}) => {
      let query = sb.from('posts').select('*')
      if (status) query = query.eq('status', status)
      return run(
        query.order('published_at', { ascending: false, nullsFirst: false })
             .order('created_at', { ascending: false }),
        ROW.post.toCamel,
      )
    },

    bySlug: (slug) => run(sb.from('posts').select('*').eq('slug', slug).single(), ROW.post.toCamel),
    byId: (id) => run(sb.from('posts').select('*').eq('id', id).single(), ROW.post.toCamel),

    create: async (input) => {
      const { data: auth_ } = await sb.auth.getUser()
      return run(
        sb.from('posts')
          .insert({ ...ROW.post.toSnake(input), status: 'draft', author_id: auth_.user?.id ?? null })
          .select()
          .single(),
        ROW.post.toCamel,
      )
    },

    // published_at and updated_at are set by the posts_publish_guard trigger,
    // which also refuses a status change without posts:publish.
    update: (id, patch) =>
      run(sb.from('posts').update(ROW.post.toSnake(patch)).eq('id', id).select().single(), ROW.post.toCamel),

    remove: (id) =>
      run(sb.from('posts').delete().eq('id', id).select().single(), ROW.post.toCamel),
  }

  const courses = {
    list: () => run(sb.from('courses').select('*').order('code'), ROW.course.toCamel),
    create: (input) =>
      run(sb.from('courses').insert(ROW.course.toSnake(input)).select().single(), ROW.course.toCamel),
    remove: (id) =>
      run(sb.from('courses').delete().eq('id', id).select().single(), ROW.course.toCamel),
  }

  const syllabi = {
    list: ({ courseId } = {}) => {
      let query = sb.from('syllabi').select('*')
      if (courseId) query = query.eq('course_id', courseId)
      return run(
        query.order('year', { ascending: false }).order('term'),
        ROW.syllabus.toCamel,
      )
    },

    /**
     * Upload the PDF to Storage first, then record the row.
     *
     * `input.file` is a browser File. The mock has no bytes to store and
     * takes `fileName` only, so both are accepted.
     */
    create: async (input) => {
      const { data: auth_ } = await sb.auth.getUser()
      const fileName = input.fileName ?? input.file?.name
      if (!fileName) throw new DataError(CODES.INVALID, 'Choose a file to upload.')

      const safe = fileName.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')
      const path = `${input.courseId}/${Date.now()}-${safe}`

      if (input.file) {
        const { error } = await sb.storage
          .from('syllabi')
          .upload(path, input.file, { contentType: input.file.type || 'application/pdf' })
        if (error) throw toDataError(error, 'Upload failed.')
      }

      try {
        return await run(
          sb.from('syllabi')
            .insert({
              course_id: input.courseId,
              term: input.term,
              year: Number(input.year),
              file_name: fileName,
              file_path: path,
              uploaded_by: auth_.user?.id ?? null,
            })
            .select()
            .single(),
          ROW.syllabus.toCamel,
        )
      } catch (error) {
        // The row lost to the unique index on (course_id, term, year), so the
        // bytes uploaded above have nothing pointing at them. Clean up rather
        // than leaving an orphan in the bucket, and say which term clashed —
        // toDataError only knows "something already exists".
        if (error.code === CODES.CONFLICT) {
          if (input.file) await sb.storage.from('syllabi').remove([path])
          throw new DataError(
            CODES.CONFLICT,
            `There is already a ${input.term} ${input.year} syllabus on this course. Remove it first to replace it.`,
          )
        }
        throw error
      }
    },

    remove: async (id) => {
      const row = await run(sb.from('syllabi').select('*').eq('id', id).single(), ROW.syllabus.toCamel)
      await sb.storage.from('syllabi').remove([row.filePath])
      return run(sb.from('syllabi').delete().eq('id', id).select().single(), ROW.syllabus.toCamel)
    },

    /** Public bucket, so the file is a plain URL — no signing needed. */
    publicUrl: (filePath) => sb.storage.from('syllabi').getPublicUrl(filePath).data.publicUrl,
  }

  const subscribers = {
    list: () =>
      run(
        sb.from('subscribers').select('*').order('created_at', { ascending: false }),
        ROW.subscriber.toCamel,
      ),

    // An RPC, not an insert: it has to upsert to reactivate an unsubscribed
    // address, and granting anon UPDATE on the table would be far worse.
    subscribe: async (email, source = 'site') => {
      const { error } = await sb.rpc('subscribe', {
        subscriber_email: email,
        subscriber_source: source,
      })
      if (error) {
        throw error.code === '22023' || /email address/i.test(error.message)
          ? new DataError(CODES.INVALID, 'That does not look like an email address.')
          : toDataError(error)
      }
      return { email: String(email).trim().toLowerCase(), source }
    },

    remove: (id) =>
      run(sb.from('subscribers').delete().eq('id', id).select().single(), ROW.subscriber.toCamel),
  }

  const forms = {
    list: ({ audience } = {}) => {
      let query = sb.from('forms').select('*')
      if (audience) query = query.eq('audience', audience)
      return run(query.order('created_at'), ROW.form.toCamel)
    },
    bySlug: (slug) => run(sb.from('forms').select('*').eq('slug', slug).single(), ROW.form.toCamel),
    byId: (id) => run(sb.from('forms').select('*').eq('id', id).single(), ROW.form.toCamel),
    // checkForm is not a permission check — RLS owns those. It catches what
    // Postgres would either reject opaquely (the audience constraint) or
    // accept and corrupt (two questions sharing a name).
    create: (input) => {
      checkForm(input)
      return run(sb.from('forms').insert(ROW.form.toSnake(input)).select().single(), ROW.form.toCamel)
    },
    update: (id, patch) => {
      checkForm(patch)
      return run(sb.from('forms').update(ROW.form.toSnake(patch)).eq('id', id).select().single(), ROW.form.toCamel)
    },
    remove: (id) =>
      run(sb.from('forms').delete().eq('id', id).select().single(), ROW.form.toCamel),
  }

  const submissions = {
    list: (formId) => {
      let query = sb.from('form_submissions').select('*')
      if (formId) query = query.eq('form_id', formId)
      return run(query.order('created_at', { ascending: false }), ROW.submission.toCamel)
    },

    create: async (formId, payload) => {
      // Required-field validation stays client-side, mirroring the mock. RLS
      // decides *whether* you may submit; it does not police field contents.
      const form = await forms.byId(formId)
      const missing = missingAnswers(form, payload)
      if (missing.length) {
        throw new DataError(CODES.INVALID, `Please fill in: ${missing.join(', ')}.`)
      }

      const { data: auth_ } = await sb.auth.getUser()
      const submittedBy = auth_.user?.id ?? null

      // Deliberately no .select() here. A RETURNING clause needs a SELECT
      // policy on form_submissions, and anonymous visitors correctly have
      // none — letting a submitter read that table back would expose every
      // other response. So the row is written blind and echoed locally.
      const { error } = await sb
        .from('form_submissions')
        .insert({ form_id: formId, payload, submitted_by: submittedBy })
      if (error) throw toDataError(error)

      return {
        id: null,
        formId,
        payload,
        submittedBy,
        createdAt: new Date().toISOString(),
      }
    },
  }

  /**
   * Call the `admin-users` Edge Function.
   *
   * Creating and deleting an account touches `auth.users`, which only the
   * service-role key may do — and that key can never be shipped to a browser.
   * So those two operations are the one place in this adapter that does not
   * go straight to PostgREST. The function verifies the caller's JWT and
   * re-checks `members:write` against the same `has_permission()` every
   * policy uses; it is not a way around RLS, only around the key.
   *
   * It answers failures as `{ error: { code, message } }` using the DataError
   * codes, so the panel branches on the same set as every other call.
   */
  async function invokeAdminUsers(action, payload) {
    const { data, error } = await sb.functions.invoke('admin-users', {
      body: { action, ...payload },
    })
    if (!error) return data

    // supabase-js buries a non-2xx body in error.context (a Response).
    let body = null
    try {
      body = await error.context?.json?.()
    } catch {
      // Non-JSON body — a gateway error or the function failing to boot.
    }

    const code = body?.error?.code
    const message = body?.error?.message ?? error.message
    if (code === 'not_deployed' || /Function not found/i.test(message)) {
      throw new DataError(
        CODES.NOT_CONFIGURED,
        'The admin-users function is not deployed. See README → Managing accounts.',
      )
    }
    throw new DataError(
      Object.values(CODES).includes(code) ? code : CODES.INVALID,
      message,
    )
  }

  const members = {
    list: () => run(sb.from('profiles').select('*').order('full_name'), ROW.member.toCamel),

    create: async (input) => {
      const data = await invokeAdminUsers('create', {
        email: input.email,
        fullName: input.fullName,
        roleId: input.roleId,
        password: input.password,
      })
      return ROW.member.toCamel(data.member)
    },

    // A role change is a plain UPDATE — profiles_write allows it, and the
    // profiles_role_guard / profiles_admin_floor triggers refuse the two
    // changes a policy cannot express.
    update: (id, patch) =>
      run(sb.from('profiles').update(ROW.member.toSnake(patch)).eq('id', id).select().single(), ROW.member.toCamel),

    remove: async (id) => {
      const data = await invokeAdminUsers('delete', { id })
      return ROW.member.toCamel(data.member)
    },
  }

  const roles = {
    list: async () =>
      (await run(sb.from('roles').select('*'), ROW.role.toCamel)).sort(compareRoles),

    // checkRole is the President-only permission rule, which the
    // roles_president_guard trigger also enforces — but as a bare 42501. The
    // id is the column default (0007), so nothing here mints one.
    create: (input) => {
      checkRole({ name: input.name ?? '', ...input })
      return run(sb.from('roles').insert(ROW.role.toSnake(input)).select().single(), ROW.role.toCamel)
        .catch(renameConflict(input.name))
    },

    update: (id, patch) => {
      checkRole(patch)
      return run(sb.from('roles').update(ROW.role.toSnake(patch)).eq('id', id).select().single(), ROW.role.toCamel)
        .catch(renameConflict(patch.name))
    },

    // profiles.role_id references roles without a cascade, so a role that
    // someone still holds fails with 23503. toDataError's generic sentence
    // does not say what to do about it; this does.
    remove: (id) =>
      run(sb.from('roles').delete().eq('id', id).select().single(), ROW.role.toCamel).catch((error) => {
        if (error.code === CODES.CONFLICT) {
          throw new DataError(
            CODES.CONFLICT,
            'Members still hold this role. Move them to another role first.',
          )
        }
        throw error
      }),
  }

  /** A 23505 on roles is the unique index on lower(name) from 0007. */
  function renameConflict(name) {
    return (error) => {
      if (error.code === CODES.CONFLICT && name) {
        throw new DataError(CODES.CONFLICT, `There is already a role called “${String(name).trim()}”.`)
      }
      throw error
    }
  }

  const events = {
    // events_read (0008) hides private events from anon, so this is the same
    // call for the site and the panel; the database decides what comes back.
    list: async ({ from, to } = {}) => {
      let query = sb.from('events').select('*')
      // An event that started before `from` but is still running counts.
      if (from) query = query.or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`)
      if (to) query = query.lte('date', to)
      return (await run(query, ROW.event.toCamel)).sort(compareEvents)
    },

    byId: (id) => run(sb.from('events').select('*').eq('id', id).single(), ROW.event.toCamel),

    create: async (input) => {
      const clean = normaliseEvent(input)
      checkEvent({ title: clean.title ?? '', date: clean.date ?? '', ...clean })
      const { data: auth_ } = await sb.auth.getUser()
      return run(
        sb.from('events')
          .insert({ ...ROW.event.toSnake(clean), created_by: auth_.user?.id ?? null })
          .select()
          .single(),
        ROW.event.toCamel,
      )
    },

    // The cross-field rules need the stored row to judge a partial patch —
    // moving only the end time has to be checked against the start time.
    update: async (id, patch) => {
      const clean = normaliseEvent(patch)
      checkEvent(clean, await events.byId(id))
      return run(
        sb.from('events').update(ROW.event.toSnake(clean)).eq('id', id).select().single(),
        ROW.event.toCamel,
      )
    },

    remove: (id) =>
      run(sb.from('events').delete().eq('id', id).select().single(), ROW.event.toCamel),
  }

  return {
    name: 'supabase',
    client: sb,
    auth,
    posts,
    courses,
    syllabi,
    subscribers,
    forms,
    submissions,
    members,
    roles,
    events,
  }
}
