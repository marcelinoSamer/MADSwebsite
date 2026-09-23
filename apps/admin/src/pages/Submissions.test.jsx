import { screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

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
