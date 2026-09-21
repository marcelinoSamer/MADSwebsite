import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

describe('Shell navigation', () => {
  it('shows every destination to the president', async () => {
    await renderAs(ROLE.president, <App />)

    await screen.findByRole('heading', { name: /overview/i })
    for (const label of ['Posts', 'Syllabi', 'Forms', 'Subscribers', 'Members']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('hides destinations a role cannot use', async () => {
    await renderAs(ROLE.writer, <App />)

    await screen.findByRole('heading', { name: /overview/i })
    expect(screen.getByRole('link', { name: 'Posts' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Subscribers' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Members' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Syllabi' })).not.toBeInTheDocument()
  })

  it('gives the academics head the syllabus archive but not the mailing list', async () => {
    await renderAs(ROLE.academics, <App />)

    await screen.findByRole('heading', { name: /overview/i })
    expect(screen.getByRole('link', { name: 'Syllabi' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Subscribers' })).not.toBeInTheDocument()
  })

  it('names the signed-in member and their role', async () => {
    await renderAs(ROLE.content, <App />)

    expect(await screen.findByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Content Head')).toBeInTheDocument()
  })
})

describe('Route gating', () => {
  it('refuses a page the role cannot use, even when reached by URL', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/subscribers' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('lets a permitted role through to the same page', async () => {
    await renderAs(ROLE.president, <App />, { route: '/subscribers' })

    expect(await screen.findByRole('heading', { name: /subscribers/i })).toBeInTheDocument()
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})
