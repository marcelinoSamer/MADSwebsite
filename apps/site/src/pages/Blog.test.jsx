import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMockAdapter, createSeed } from '@mads/db'
import Blog from './Blog'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Blog', () => {
  it('lists published posts, newest first', async () => {
    renderWithProviders(<Blog />)

    const links = await screen.findAllByRole('link', { name: /datathon|study group/i })
    expect(links[0]).toHaveAttribute('href', '/blog/datathon-2026-recap')
  })

  it('does not show drafts', async () => {
    renderWithProviders(<Blog />)

    await screen.findByRole('heading', { name: /first datathon/i })
    expect(screen.queryByText(/spring speaker series/i)).not.toBeInTheDocument()
  })

  it('shows an empty state rather than a bare page when nothing is published', async () => {
    const seed = createSeed()
    seed.posts = []

    renderWithProviders(<Blog />, { client: createMockAdapter({ seed }) })

    expect(await screen.findByText(/the first one is being written/i)).toBeInTheDocument()
  })
})
