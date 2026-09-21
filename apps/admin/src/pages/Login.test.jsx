import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Login', () => {
  it('is what an unauthenticated visitor gets, whatever they asked for', async () => {
    renderWithProviders(<App />, { route: '/subscribers' })
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('rejects bad credentials with a message', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(screen.getByLabelText(/email/i), 'mads@aucegypt.edu')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match an account/i)
  })

  it('signs in and lands on the overview', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/login' })

    await user.type(screen.getByLabelText(/email/i), 'mads@aucegypt.edu')
    await user.type(screen.getByLabelText(/password/i), 'mads')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /overview/i })).toBeInTheDocument()
  })

  it('returns the visitor to the page they originally asked for', async () => {
    const user = userEvent.setup()
    renderWithProviders(<App />, { route: '/subscribers' })

    await screen.findByRole('heading', { name: /sign in/i })
    await user.type(screen.getByLabelText(/email/i), 'mads@aucegypt.edu')
    await user.type(screen.getByLabelText(/password/i), 'mads')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /subscribers/i })).toBeInTheDocument()
  })
})
