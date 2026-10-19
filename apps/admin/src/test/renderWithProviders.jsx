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

/** The seeded roles. Tests name a role, not a person. */
export const ROLE = {
  president: 'role-president',
  vicePresident: 'role-vice-president',
  content: 'role-content',
  academics: 'role-academics',
  events: 'role-events',
  writer: 'role-writer',
}

/**
 * Render with a session already established, holding `roleId`.
 *
 * Most of the admin panel is unreachable signed out, so the interesting
 * question is almost always "what does *this role* see". Every role but one
 * gets a purpose-built member via `withMember` ("Test User") rather than a
 * demo account living in the seed. The exception is the President, which
 * belongs to one fixed account: `renderAs(ROLE.president)` signs in as
 * mads@aucegypt.edu, and Test User is still in the roster, as a Writer.
 */
export async function renderAs(roleId, ui, options = {}) {
  const president = roleId === ROLE.president
  const seed = withMember(president ? ROLE.writer : roleId)
  const client = createMockAdapter({ seed })
  await client.auth.signIn({
    email: president ? 'mads@aucegypt.edu' : 'test@mads.auc',
    password: DEV_PASSWORD,
  })
  return renderWithProviders(ui, { ...options, client })
}
