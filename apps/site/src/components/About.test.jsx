import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import About from './About'

describe('About', () => {
  it('renders the vision heading and lead paragraph', () => {
    render(<About />)
    expect(
      screen.getByRole('heading', { name: /making a demanding field feel like home/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/mathematics, actuarial science, and data science/i)).toBeInTheDocument()
  })
})