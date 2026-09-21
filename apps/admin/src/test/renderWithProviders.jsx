import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DataProvider } from '@mads/db/react'
import { createMockAdapter, withMember, DEV_PASSWORD } from '@mads/db'

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

/** The four roles. Tests name a role, not a person. */
export const ROLE = {
  president: 'role-president',
  content: 'role-content',
  academics: 'role-academics',
  writer: 'role-writer',
}

/**
 * Render with a session already established, holding `roleId`.
 *
 * Most of the admin panel is unreachable signed out, so the interesting
 * question is almost always "what does *this role* see". Both real accounts
 * are President, so anything narrower gets a purpose-built member via
 * `withMember` rather than a demo account living in the seed.
 */
export async function renderAs(roleId, ui, options = {}) {
  const seed = withMember(roleId)
  const client = createMockAdapter({ seed })
  await client.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })
  return renderWithProviders(ui, { ...options, client })
}
