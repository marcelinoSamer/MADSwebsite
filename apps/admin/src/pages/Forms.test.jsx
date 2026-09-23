import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { createMockAdapter, createSeed, withMember, DEV_PASSWORD } from '@mads/db'
import App from '../App'
import { renderWithProviders, renderAs, ROLE } from '../test/renderWithProviders'

const rowFor = async (name) => (await screen.findByRole('rowheader', { name })).closest('tr')

describe('Forms', () => {
  it('distinguishes public forms from internal ones', async () => {
    await renderAs(ROLE.president, <App />, { route: '/forms' })

    const row = await rowFor(/tell us what you think/i)
    expect(within(row).getByText('public')).toBeInTheDocument()

    const internal = await rowFor(/venue reservation/i)
    expect(within(internal).getByText('internal')).toBeInTheDocument()
  })

  it('closes a form so the site stops accepting it', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms' })

    const row = await rowFor(/tell us what you think/i)
    await user.click(within(row).getByRole('button', { name: /^close$/i }))

    const form = await client.forms.bySlug('feedback')
    expect(form.isOpen).toBe(false)
  })

  // The point of the page for most of the committee: a Writer holds neither
  // forms:write nor submissions:read and still has to get to a venue request.
  it('lets a role without forms:write reach a form to fill in', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/forms' })

    const row = await rowFor(/venue reservation/i)
    expect(within(row).getByRole('link', { name: /fill in/i })).toBeInTheDocument()
  })

  it('offers that role no way to edit or read the answers', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/forms' })

    const row = await rowFor(/venue reservation/i)
    expect(within(row).queryByRole('link', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(within(row).queryByRole('link', { name: /responses/i })).not.toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /new form/i })).not.toBeInTheDocument()
  })

  it('hides a closed form from a role that cannot reopen it', async () => {
    const seed = withMember(ROLE.writer)
    seed.forms.find((f) => f.slug === 'venue-reservation').isOpen = false
    const client = createMockAdapter({ seed })
    await client.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })

    renderWithProviders(<App />, { route: '/forms', client })

    expect(await screen.findByRole('rowheader', { name: /tell us what you think/i })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: /venue reservation/i })).not.toBeInTheDocument()
  })

  it('shows a president the closed form and the way to reopen it', async () => {
    const seed = createSeed()
    seed.forms.find((f) => f.slug === 'venue-reservation').isOpen = false
    const client = createMockAdapter({ seed })
    await client.auth.signIn({ email: 'mads@aucegypt.edu', password: DEV_PASSWORD })

    renderWithProviders(<App />, { route: '/forms', client })

    const row = await rowFor(/venue reservation/i)
    expect(within(row).getByRole('button', { name: /reopen/i })).toBeInTheDocument()
    // Nothing to fill in while it is closed.
    expect(within(row).queryByRole('link', { name: /fill in/i })).not.toBeInTheDocument()
  })
})
