import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { createMockAdapter, createSeed } from '@mads/db'
import Syllabi from './Syllabi'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Syllabi', () => {
  it('groups syllabus files under their course', async () => {
    renderWithProviders(<Syllabi />)

    expect(await screen.findByRole('heading', { name: /mathematical statistics/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /fall 2026.*MACT3223/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /spring 2026.*MACT3223/i })).toBeInTheDocument()
  })

  it('says so when a course has no syllabus on file', async () => {
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    expect(screen.getAllByText(/no syllabus on file yet/i).length).toBeGreaterThan(0)
  })

  it('counts the courses and the files on them', async () => {
    renderWithProviders(<Syllabi />)

    expect(await screen.findByText(/5 courses/)).toHaveTextContent('4 syllabi')
  })

  it('filters by course code', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    await user.type(screen.getByRole('searchbox', { name: /search by course/i }), 'CSCE')

    expect(screen.getByRole('heading', { name: /fundamentals of data science/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /probability theory/i })).not.toBeInTheDocument()
  })

  it('filters by level, offering only the levels in the archive', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    expect(screen.queryByRole('button', { name: 'Freshman' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Senior' }))

    expect(screen.getByRole('heading', { name: /stochastic processes/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /probability theory/i })).not.toBeInTheDocument()
  })

  it('hides courses with nothing on file when asked to', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /actuarial mathematics/i })
    await user.click(screen.getByRole('checkbox', { name: /only courses with a syllabus/i }))

    expect(screen.queryByRole('heading', { name: /actuarial mathematics/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /probability theory/i })).toBeInTheDocument()
  })

  it('clears every filter at once', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    await user.click(screen.getByRole('button', { name: 'Senior' }))
    await user.click(screen.getByRole('button', { name: /clear filters/i }))

    expect(screen.getByRole('heading', { name: /probability theory/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All levels' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('reports a search that matches nothing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    await user.type(screen.getByRole('searchbox', { name: /search by course/i }), 'ZZZZ')

    expect(screen.getByText(/no course matches/i)).toBeInTheDocument()
  })

  it('says the archive is empty rather than showing an empty list', async () => {
    const seed = createSeed()
    seed.courses = []
    seed.syllabi = []

    renderWithProviders(<Syllabi />, { client: createMockAdapter({ seed }) })

    expect(await screen.findByText(/the archive is empty/i)).toBeInTheDocument()
  })
})
