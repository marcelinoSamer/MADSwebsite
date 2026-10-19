import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { PERMISSIONS } from '@mads/db'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

/** A role's editor, found by its accessible name — the role's own name. */
const editorFor = async (name) => screen.findByRole('form', { name })

describe('Roles', () => {
  it('shows the President as fixed, with nothing to edit', async () => {
    await renderAs(ROLE.president, <App />, { route: '/roles' })

    const president = await screen.findByRole('region', { name: 'President' })
    expect(president).toHaveTextContent(/fixed/i)
    expect(president).toHaveTextContent('mads@aucegypt.edu')
    expect(screen.queryByRole('form', { name: 'President' })).not.toBeInTheDocument()
  })

  it('lets the President decide which roles can create forms', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/roles' })

    const writer = await editorFor('Writer')
    await user.click(within(writer).getByLabelText(/create and edit forms/i))
    await user.click(within(writer).getByRole('button', { name: /save writer/i }))

    expect(await within(writer).findByRole('status')).toHaveTextContent(/saved/i)
    const roles = await client.roles.list()
    expect(roles.find((r) => r.id === ROLE.writer).permissions).toContain(PERMISSIONS.FORMS_WRITE)
  })

  it('never offers member management as a permission', async () => {
    await renderAs(ROLE.president, <App />, { route: '/roles' })

    await editorFor('Writer')
    expect(screen.queryByLabelText(/manage members and roles/i)).not.toBeInTheDocument()
  })

  it('adds a role with calendar access', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/roles' })

    await user.type(await screen.findByLabelText('Role name', { selector: '#role-new-name' }), 'Outreach Head')
    await user.click(screen.getByLabelText(/add, edit and remove calendar events/i, { selector: '#role-new-events\\:write' }))
    await user.click(screen.getByRole('button', { name: /add role/i }))

    expect(await editorFor('Outreach Head')).toBeInTheDocument()
    const role = (await client.roles.list()).find((r) => r.name === 'Outreach Head')
    expect(role.permissions).toEqual([PERMISSIONS.EVENTS_WRITE])
  })

  it('says who holds each role, and will not delete one that is held', async () => {
    await renderAs(ROLE.president, <App />, { route: '/roles' })

    const writer = await editorFor('Writer')
    expect(within(writer).getByText('Test User')).toBeInTheDocument()
    expect(within(writer).queryByRole('button', { name: /delete the writer role/i })).not.toBeInTheDocument()
  })

  it('deletes an empty role after the button is armed', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/roles' })

    const academics = await editorFor('Academics Head')
    await user.click(within(academics).getByRole('button', { name: /delete the academics head role/i }))
    await user.click(within(academics).getByRole('button', { name: /delete for good/i }))

    expect((await client.roles.list()).some((r) => r.id === ROLE.academics)).toBe(false)
  })

  it('answers "who can make forms" in one table', async () => {
    await renderAs(ROLE.president, <App />, { route: '/roles' })

    const table = within(await screen.findByRole('region', { name: /who can do what/i }))
    const row = table.getByText(/create and edit forms/i).closest('tr')
    expect(row).toHaveTextContent('Events Head')
    expect(row).toHaveTextContent('MADS')
  })

  it('is closed to everyone but the President', async () => {
    await renderAs(ROLE.vicePresident, <App />, { route: '/roles' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
  })
})
