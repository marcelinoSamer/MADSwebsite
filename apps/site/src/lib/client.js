import { createDataClient, browserStorage } from '@mads/db'

/**
 * The public site's data client.
 *
 * Today this resolves to the in-memory mock. The moment VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY exist in the environment it resolves to Supabase
 * instead, with no change here or in any component.
 *
 * A little latency in dev is deliberate — loading and empty states are the
 * ones that get shipped broken, so they should be visible while building.
 */
export const client = createDataClient({
  env: import.meta.env,
  latency: import.meta.env.DEV ? 180 : 0,
  storage: browserStorage(),
})
