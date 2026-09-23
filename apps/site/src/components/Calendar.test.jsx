import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Calendar from './Calendar'

describe('Calendar', () => {
  it('lists every entry with a machine-readable date', () => {
    render(<Calendar />)

    const entries = screen.getAllByRole('listitem')
    expect(entries.length).toBeGreaterThan(0)

    for (const entry of entries) {
      expect(within(entry).getByRole('heading', { level: 3 })).toBeInTheDocument()
      // The <time> carries the ISO form; the visible text is the short date.
      expect(entry.querySelector('time')).toHaveAttribute(
        'dateTime',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      )
    }
  })

  it('is reachable as the #calendar section', () => {
    const { container } = render(<Calendar />)
    expect(container.querySelector('#calendar')).toBeInTheDocument()
  })
})
