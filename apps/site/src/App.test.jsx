import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { renderWithProviders } from './test/renderWithProviders'

describe('App', () => {
  it('renders the hero heading on the landing route', () => {
    renderWithProviders(<App />, { route: '/' })
    expect(
      screen.getByRole('heading', {
        name: /mathematics, actuarial & data science association/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the blog index at /blog', async () => {
    renderWithProviders(<App />, { route: '/blog' })
    expect(
      await screen.findByRole('heading', { name: /notes from the association/i }),
    ).toBeInTheDocument()
  })

  it('renders a published post at its slug', async () => {
    renderWithProviders(<App />, { route: '/blog/datathon-2026-recap' })
    expect(
      await screen.findByRole('heading', { name: /what we learned running our first datathon/i }),
    ).toBeInTheDocument()
  })

  it('renders the syllabus archive at /syllabi', async () => {
    renderWithProviders(<App />, { route: '/syllabi' })
    expect(
      await screen.findByRole('heading', { name: /course syllabi, in one place/i }),
    ).toBeInTheDocument()
  })

  it('falls back to a not-found page for an unknown route', async () => {
    renderWithProviders(<App />, { route: '/nope' })
    expect(
      await screen.findByRole('heading', { name: /outside the sample/i }),
    ).toBeInTheDocument()
  })
})
