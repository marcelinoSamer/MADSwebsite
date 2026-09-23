import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import JoinCta from './JoinCta'
import { renderWithProviders } from '../test/renderWithProviders'

describe('JoinCta', () => {
  it('renders the call-to-action heading', () => {
    renderWithProviders(<JoinCta />)
    expect(
      screen.getByRole('heading', { name: /keep an eye on the term/i }),
    ).toBeInTheDocument()
  })

  it('offers the newsletter sign-up and a route to the feedback form', () => {
    renderWithProviders(<JoinCta />)
    expect(screen.getByRole('textbox', { name: /get the newsletter/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /send us feedback/i })).toHaveAttribute(
      'href',
      '/forms/feedback',
    )
  })

  it('confirms a successful sign-up and records the address', async () => {
    const user = userEvent.setup()
    const { client } = renderWithProviders(<JoinCta />)

    await user.type(
      screen.getByRole('textbox', { name: /get the newsletter/i }),
      'new.member@aucegypt.edu',
    )
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/you’re on the list/i)).toBeInTheDocument()

    await client.auth.signIn({ email: 'mads@aucegypt.edu', password: 'mads' })
    await waitFor(async () => {
      const subscribers = await client.subscribers.list()
      expect(subscribers.map((s) => s.email)).toContain('new.member@aucegypt.edu')
    })
  })

  it('reports a malformed address instead of silently dropping it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<JoinCta />)

    await user.type(screen.getByRole('textbox', { name: /get the newsletter/i }), 'nope')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/does not look like an email/i)
  })
})
