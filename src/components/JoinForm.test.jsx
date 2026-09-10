import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import JoinForm from './JoinForm'

describe('JoinForm', () => {
  it('renders all the expected fields', () => {
    render(<JoinForm />)
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/auc email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/major/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/year/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/why do you want to join/i)).toBeInTheDocument()
  })

  it('shows a thank-you message after submitting', async () => {
    const user = userEvent.setup()
    render(<JoinForm />)

    await user.type(screen.getByLabelText(/full name/i), 'Sedra Test')
    await user.type(screen.getByLabelText(/auc email/i), 'sedra@aucegypt.edu')
    await user.type(screen.getByLabelText(/major/i), 'Data Science')
    await user.selectOptions(screen.getByLabelText(/year/i), 'Junior')
    await user.type(screen.getByLabelText(/why do you want to join/i), 'I love math.')
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    expect(screen.getByText(/we've got your answer, sedra/i)).toBeInTheDocument()
  })
})