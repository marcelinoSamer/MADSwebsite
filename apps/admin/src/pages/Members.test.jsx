import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

/** Fill the add-member form. The temporary password arrives prefilled. */
async function fillNewMember(user, { name, email, role = 'role-writer' }) {
  await user.type(await screen.findByLabelText(/full name/i), name)
  await user.type(screen.getByLabelText(/^email$/i), email)
  await user.selectOptions(screen.getByLabelText(/^role$/i), role)
}

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

  it('adds a member and shows the temporary password once', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/members' })

    await fillNewMember(user, { name: 'Nour Hassan', email: 'nour@aucegypt.edu' })
    const password = screen.getByLabelText(/temporary password/i).value
    await user.click(screen.getByRole('button', { name: /add member/i }))

    // Stored, not merely rendered.
    const members = await client.members.list()
    expect(members.find((m) => m.email === 'nour@aucegypt.edu')).toMatchObject({
      fullName: 'Nour Hassan',
      roleId: 'role-writer',
    })

    const note = await screen.findByRole('status')
    expect(note).toHaveTextContent(/Nour Hassan can now sign in as Writer/i)
    expect(within(note).getByText(password)).toBeInTheDocument()

    // And the roster picked them up.
    expect(await screen.findByRole('combobox', { name: /role for Nour Hassan/i })).toBeInTheDocument()
  })

  it('refuses an address that already has an account', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/members' })

    await fillNewMember(user, { name: 'Impostor', email: 'mads@aucegypt.edu' })
    await user.click(screen.getByRole('button', { name: /add member/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already has an account/i)
    expect(await client.members.list()).toHaveLength(3)
  })

  it('deletes a member, but only after the button is armed', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/members' })

    await user.click(await screen.findByRole('button', { name: /remove MADS Admin/i }))
    // Still there — the first click only arms it.
    expect((await client.members.list()).some((m) => m.fullName === 'MADS Admin')).toBe(true)

    await user.click(screen.getByRole('button', { name: /delete for good/i }))

    const members = await client.members.list()
    expect(members.some((m) => m.fullName === 'MADS Admin')).toBe(false)
  })

  it('offers no way to delete your own account', async () => {
    await renderAs(ROLE.president, <App />, { route: '/members' })

    await screen.findByRole('combobox', { name: /role for Test User/i })
    expect(screen.queryByRole('button', { name: /remove Test User/i })).not.toBeInTheDocument()
  })

  it('keeps a narrower role out of the page entirely', async () => {
    await renderAs(ROLE.content, <App />, { route: '/members' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument()
  })

  it('spells out what each role can do', async () => {
    await renderAs(ROLE.president, <App />, { route: '/members' })

    const panel = (await screen.findByRole('heading', { name: /what each role can do/i })).closest(
      'section',
    )
    expect(within(panel).getAllByText(/publish posts to the live site/i).length).toBeGreaterThan(0)
  })
})
