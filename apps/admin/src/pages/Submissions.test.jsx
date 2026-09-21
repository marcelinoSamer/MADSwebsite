import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

describe('Forms', () => {
  it('distinguishes public forms from internal ones', async () => {
    await renderAs(ROLE.president, <App />, { route: '/forms' })

    const row = (await screen.findByRole('rowheader', { name: /tell us what you think/i })).closest('tr')
    expect(within(row).getByText('public')).toBeInTheDocument()
  })

  it('closes a form so the site stops accepting it', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms' })

    const row = (await screen.findByRole('rowheader', { name: /tell us what you think/i })).closest('tr')
    await user.click(within(row).getByRole('button', { name: /^close$/i }))

    const form = await client.forms.bySlug('feedback')
    expect(form.isOpen).toBe(false)
  })
})

describe('Submissions', () => {
  it('builds columns from the form definition and shows the responses', async () => {
    await renderAs(ROLE.president, <App />, { route: '/forms/form-1/submissions' })

    expect(await screen.findByRole('columnheader', { name: /your feedback/i })).toBeInTheDocument()
    expect(screen.getByText(/moved too fast for beginners/i)).toBeInTheDocument()
  })

  it('shows a placeholder where an optional field was left blank', async () => {
    await renderAs(ROLE.president, <App />, { route: '/forms/form-1/submissions' })

    const row = (await screen.findByText(/more evening events/i)).closest('tr')
    expect(within(row).getByText('—')).toBeInTheDocument()
  })

  it('is closed to a role that cannot read submissions', async () => {
    await renderAs(ROLE.content, <App />, { route: '/forms/form-1/submissions' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
  })
})
