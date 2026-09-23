import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Route, Routes } from 'react-router'
import BlogPost from './BlogPost'
import { renderWithProviders } from '../test/renderWithProviders'

const renderAt = (slug, options) =>
  renderWithProviders(
    <Routes>
      <Route path="/blog/:slug" element={<BlogPost />} />
    </Routes>,
    { route: `/blog/${slug}`, ...options },
  )

describe('BlogPost', () => {
  it('renders the markdown body as headings and lists', async () => {
    renderAt('datathon-2026-recap')

    expect(await screen.findByRole('heading', { level: 1, name: /first datathon/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /the format/i })).toBeInTheDocument()
    expect(screen.getByText(/publish the dataset 48 hours early/i).tagName).toBe('LI')
  })

  it('heads the post with its date and reading time', async () => {
    renderAt('datathon-2026-recap')

    expect(await screen.findByText('12 September 2026')).toBeInTheDocument()
    expect(screen.getByText(/\d+ min read/)).toBeInTheDocument()
  })

  it('links to the next post along, the way round the list is ordered', async () => {
    renderAt('datathon-2026-recap')

    // The newest published post: there is an older one and nothing newer.
    const older = await screen.findByRole('link', { name: /older.*study group/i })
    expect(older).toHaveAttribute('href', '/blog/actuarial-exam-study-group')
    expect(screen.queryByRole('link', { name: /newer/i })).not.toBeInTheDocument()
  })

  it('does not render a draft that someone has the link to', async () => {
    renderAt('spring-speaker-series')

    expect(await screen.findByText(/not published yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /first three names/i })).not.toBeInTheDocument()
  })
})
