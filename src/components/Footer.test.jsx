import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from './Footer'

describe('Footer', () => {
  it('renders footer navigation links', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^join$/i })).toBeInTheDocument()
  })
})