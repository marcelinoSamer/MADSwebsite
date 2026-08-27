import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Navbar from './Navbar'

describe('Navbar', () => {
  it('renders a link to each main section', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /activities/i })).toBeInTheDocument()
  })

  it('renders a "Join MADS" call-to-action', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /join mads/i })).toBeInTheDocument()
  })
})