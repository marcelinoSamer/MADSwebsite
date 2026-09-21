import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import Navbar from './Navbar'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Navbar', () => {
  it('renders a link to each main section', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /activities/i })).toBeInTheDocument()
  })

  it('renders a "Join MADS" call-to-action', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByRole('link', { name: /join mads/i })).toBeInTheDocument()
  })

  it('links to the blog and the syllabus archive', () => {
    renderWithProviders(<Navbar />)
    expect(screen.getByRole('link', { name: /blog/i })).toHaveAttribute('href', '/blog')
    expect(screen.getByRole('link', { name: /syllabi/i })).toHaveAttribute('href', '/syllabi')
  })

  it('points section links at the landing page when on another route', () => {
    renderWithProviders(<Navbar />, { route: '/blog' })
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '/#about')
  })

  it('uses a bare hash on the landing page so native scrolling handles it', () => {
    renderWithProviders(<Navbar />, { route: '/' })
    expect(screen.getByRole('link', { name: /about/i })).toHaveAttribute('href', '#about')
  })

  describe('mobile menu', () => {
    it('is collapsed by default', () => {
      renderWithProviders(<Navbar />)
      expect(screen.getByRole('button', { name: /menu/i })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    it('reveals the navigation when opened', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Navbar />)

      await user.click(screen.getByRole('button', { name: /menu/i }))

      expect(screen.getByRole('button', { name: /close/i })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
      // Both the desktop list and the panel are now in the tree.
      expect(screen.getAllByRole('link', { name: /blog/i })).toHaveLength(2)
    })
  })
})
