import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
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

  it('filters by course code', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    await user.type(screen.getByRole('searchbox', { name: /search by course/i }), 'CSCE')

    expect(screen.getByRole('heading', { name: /fundamentals of data science/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /probability theory/i })).not.toBeInTheDocument()
  })

  it('reports a search that matches nothing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Syllabi />)

    await screen.findByRole('heading', { name: /probability theory/i })
    await user.type(screen.getByRole('searchbox', { name: /search by course/i }), 'ZZZZ')

    expect(screen.getByText(/no course matches/i)).toBeInTheDocument()
  })
})
