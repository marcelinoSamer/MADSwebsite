import { screen, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMockAdapter, createSeed } from '@mads/db'
import Calendar from './Calendar'
import { renderWithProviders } from '../test/renderWithProviders'

describe('Calendar', () => {
  // Only `Date` is faked: the list is "from today", and the seed's dates are
  // fixed. Faking timers too would stall the adapter's promises.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('lists the upcoming public events with machine-readable dates', async () => {
    renderWithProviders(<Calendar />)

    expect(await screen.findByRole('heading', { name: 'Actuarial exam info session' })).toBeInTheDocument()

    const entries = screen.getAllByRole('listitem')
    expect(entries.map((entry) => within(entry).getByRole('heading', { level: 3 }).textContent)).toEqual([
      'Actuarial exam info session',
      'Datathon',
    ])
    for (const entry of entries) {
      expect(entry.querySelector('time')).toHaveAttribute(
        'dateTime',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      )
    }
  })

  it('leaves out past events and members-only ones', async () => {
    renderWithProviders(<Calendar />)

    await screen.findByRole('heading', { name: 'Datathon' })
    // Sep 28 has passed; the board meeting is not public.
    expect(screen.queryByRole('heading', { name: 'Semester kick-off' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Board meeting' })).not.toBeInTheDocument()
  })

  it('names the semester and shows a multi-day event as a range', async () => {
    renderWithProviders(<Calendar />)

    expect(screen.getByRole('heading', { level: 2, name: 'Fall 2026' })).toBeInTheDocument()
    const datathon = (await screen.findByRole('heading', { name: 'Datathon' })).closest('li')
    expect(within(datathon).getByText('Nov 7–8')).toBeInTheDocument()
  })

  it('says so when nothing is scheduled', async () => {
    const seed = createSeed()
    seed.events = []
    renderWithProviders(<Calendar />, { client: createMockAdapter({ seed }) })

    expect(await screen.findByText(/nothing is scheduled yet/i)).toBeInTheDocument()
  })

  it('is reachable as the #calendar section', () => {
    const { container } = renderWithProviders(<Calendar />)
    expect(container.querySelector('#calendar')).toBeInTheDocument()
  })
})
