import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TeamContact from './TeamContact'

describe('TeamContact', () => {
  it('renders the section heading', () => {
    render(<TeamContact />)
    expect(
      screen.getByRole('heading', { name: /meet the team behind mads/i })
    ).toBeInTheDocument()
  })

  it('renders at least one team member email link', () => {
    render(<TeamContact />)
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0)
  })
})