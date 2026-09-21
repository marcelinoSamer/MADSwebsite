import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

describe('Members', () => {
  it('lists members with their current role', async () => {
    await renderAs(ROLE.president, <App />, { route: '/members' })

    expect(await screen.findByRole('combobox', { name: /role for MADS Admin/i })).toHaveValue(
      'role-president',
    )
  })

  it('reassigns a role', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/members' })

    await user.selectOptions(
      await screen.findByRole('combobox', { name: /role for MADS Admin/i }),
      'role-content',
    )

    const members = await client.members.list()
    expect(members.find((m) => m.fullName === 'MADS Admin').roleId).toBe('role-content')
  })

  it('will not let you change your own role', async () => {
    await renderAs(ROLE.president, <App />, { route: '/members' })

    expect(await screen.findByRole('combobox', { name: /role for Test User/i })).toBeDisabled()
  })

  it('spells out what each role can do', async () => {
    await renderAs(ROLE.president, <App />, { route: '/members' })

    const panel = (await screen.findByRole('heading', { name: /what each role can do/i })).closest(
      'section',
    )
    expect(within(panel).getAllByText(/publish posts to the live site/i).length).toBeGreaterThan(0)
  })
})
