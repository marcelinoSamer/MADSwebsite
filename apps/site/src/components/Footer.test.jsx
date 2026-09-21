import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Footer from './Footer'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Footer', () => {
  it('renders footer navigation links', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^join$/i })).toBeInTheDocument()
  })

  it('links to the routes that are not sections of the landing page', () => {
    renderWithProviders(<Footer />)
    expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute('href', '/blog')
    expect(screen.getByRole('link', { name: /syllabi/i })).toHaveAttribute('href', '/syllabi')
    expect(screen.getByRole('link', { name: /feedback/i })).toHaveAttribute(
      'href',
      '/forms/feedback',
    )
  })
})
