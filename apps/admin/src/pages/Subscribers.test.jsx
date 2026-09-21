import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

describe('Subscribers', () => {
  it('counts only active subscribers in the summary', async () => {
    await renderAs(ROLE.president, <App />, { route: '/subscribers' })

    // The seed has four addresses, one of them unsubscribed.
    expect(await screen.findByText(/3 active/i)).toBeInTheDocument()
  })

  it('marks an unsubscribed address as such rather than hiding it', async () => {
    await renderAs(ROLE.president, <App />, { route: '/subscribers' })

    const row = (await screen.findByRole('rowheader', { name: 'old@aucegypt.edu' })).closest('tr')
    expect(within(row).getByText('unsubscribed')).toBeInTheDocument()
  })

  it('removes an address', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/subscribers' })

    await user.click(await screen.findByRole('button', { name: /remove karim@aucegypt\.edu/i }))

    const remaining = await client.subscribers.list()
    expect(remaining.map((s) => s.email)).not.toContain('karim@aucegypt.edu')
  })
})
