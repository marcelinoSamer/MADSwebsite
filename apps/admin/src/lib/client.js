import { createDataClient, browserStorage } from '@mads/db'

/**
 * The admin panel's data client.
 *
 * Deliberately the same factory as the public site's: both apps talk to one
 * backend, and the admin panel gets no privileged channel of its own. What
 * an editor may do is decided by their role, enforced by the adapter today
 * and by RLS once Postgres exists — never by which app made the call.
 */
export const client = createDataClient({
  env: import.meta.env,
  latency: import.meta.env.DEV ? 180 : 0,
  storage: browserStorage(),
})
