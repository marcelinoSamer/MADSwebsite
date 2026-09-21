#!/usr/bin/env node
/**
 * Create (or repair) the admin accounts in Supabase Auth.
 *
 *   node scripts/seed-supabase.mjs
 *
 * Passwords are read from .env and never touch the repo — a password in a
 * migration is a password in git history forever. Re-running is safe: an
 * account that already exists has its password and role reset to match .env,
 * which is also how you rotate one.
 *
 * Requires the service-role key, so this only ever runs from a laptop or CI.
 * Never ship this key to a browser.
 */
import { createClient } from '@supabase/supabase-js'
import { loadEnv, require_ } from './loadEnv.mjs'

const env = loadEnv()
const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = require_(
  env,
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
)

const admin = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ACCOUNTS = [
  {
    email: env.MADS_EMAIL,
    password: env.MADS_PASSWORD,
    fullName: 'MADS',
    roleId: 'role-president',
  },
  {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    fullName: 'MADS Admin',
    roleId: 'role-president',
  },
].filter((account) => account.email && account.password)

if (!ACCOUNTS.length) {
  throw new Error('.env defines no accounts (MADS_EMAIL/PASSWORD, ADMIN_EMAIL/PASSWORD).')
}

/** Page through auth users to find one by email — there is no get-by-email. */
async function findUser(email) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((user) => user.email?.toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

for (const account of ACCOUNTS) {
  const existing = await findUser(account.email)
  let userId

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
    })
    if (error) throw new Error(`Updating ${account.email}: ${error.message}`)
    userId = existing.id
    console.log(`  updated  ${account.email}`)
  } else {
    // email_confirm skips the confirmation mail: these are staff accounts
    // created by hand, and one of the domains is not publicly routable.
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    })
    if (error) throw new Error(`Creating ${account.email}: ${error.message}`)
    userId = data.user.id
    console.log(`  created  ${account.email}`)
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: account.email,
      full_name: account.fullName,
      role_id: account.roleId,
    },
    { onConflict: 'id' },
  )
  if (profileError) throw new Error(`Profile for ${account.email}: ${profileError.message}`)
  console.log(`           → profile as ${account.roleId}`)
}

console.log(`\nDone. ${ACCOUNTS.length} account(s) ready.`)
