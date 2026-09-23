import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import About from './About'

describe('About', () => {
  it('says what the association is in one paragraph', () => {
    render(<About />)
    expect(
      screen.getByText(/student association for the mathematics, actuarial science, and data science majors/i),
    ).toBeInTheDocument()
  })
})
