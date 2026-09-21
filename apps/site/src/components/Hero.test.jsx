import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import Hero from './Hero'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Hero', () => {
  it('names the association in the page heading', () => {
    renderWithProviders(<Hero />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /mathematics, actuarial & data science association/i,
      }),
    ).toBeInTheDocument()
  })

  it('links to the two archives without scrolling', () => {
    renderWithProviders(<Hero />)
    expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute('href', '/blog')
    expect(screen.getByRole('link', { name: /syllabi/i })).toHaveAttribute('href', '/syllabi')
  })

  it('subscribes from the hero form itself', async () => {
    const user = userEvent.setup()
    const { client } = renderWithProviders(<Hero />)

    await user.type(
      screen.getByRole('textbox', { name: /events and deadlines/i }),
      'hero.reader@aucegypt.edu',
    )
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/you’re on the list/i)).toBeInTheDocument()

    await client.auth.signIn({ email: 'mads@aucegypt.edu', password: 'mads' })
    const subscribers = await client.subscribers.list()
    expect(subscribers.map((s) => s.email)).toContain('hero.reader@aucegypt.edu')
  })
})
