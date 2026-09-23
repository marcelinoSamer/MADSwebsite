import { createMockAdapter } from './mockAdapter.js'
import { createSupabaseAdapter } from './supabaseAdapter.js'

export { createMockAdapter, DEV_PASSWORD, MIN_PASSWORD_LENGTH } from './mockAdapter.js'
export { AUDIENCES, AUDIENCE_LABELS, FIELD_TYPES } from './formRules.js'
export { createSupabaseAdapter } from './supabaseAdapter.js'
export { createSeed, withMember } from './seed.js'
export { DataError, CODES } from './errors.js'
export { PERMISSIONS, PERMISSION_LABELS, ALL_PERMISSIONS, can } from './permissions.js'

/**
 * Build the data client for an app.
 *
 * `adapter: 'auto'` uses Supabase when both env vars are present and the mock
 * otherwise, so no app code or import changes on the day the project exists —
 * only the environment does.
 */
export function createDataClient({
  adapter = 'auto',
  latency = 0,
  storage = null,
  env = {},
} = {}) {
  const configured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY)

  if (adapter === 'supabase' || (adapter === 'auto' && configured)) {
    return createSupabaseAdapter({ url: env.VITE_SUPABASE_URL, anonKey: env.VITE_SUPABASE_ANON_KEY })
  }

  return createMockAdapter({ latency, storage })
}

/**
 * localStorage when it exists, otherwise null so the adapter stays in memory.
 * Safari in private mode throws on access, hence the try.
 */
export function browserStorage() {
  try {
    const key = '__mads_probe__'
    globalThis.localStorage.setItem(key, '1')
    globalThis.localStorage.removeItem(key)
    return globalThis.localStorage
  } catch {
    return null
  }
}
