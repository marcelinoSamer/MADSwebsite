import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DataProvider } from '@mads/db/react'
import { createMockAdapter } from '@mads/db'

/**
 * Render a component with the two providers the app always has: a router and
 * a data client.
 *
 * Each call gets a fresh in-memory adapter, so tests never share state and
 * never need to reset one. Pass `client` to supply a pre-signed-in or
 * pre-seeded one, and `route` to start somewhere other than `/`.
 */
export function renderWithProviders(
  ui,
  { route = '/', client = createMockAdapter(), ...options } = {},
) {
  const result = render(
    <MemoryRouter initialEntries={[route]}>
      <DataProvider client={client}>{ui}</DataProvider>
    </MemoryRouter>,
    options,
  )

  return { ...result, client }
}
