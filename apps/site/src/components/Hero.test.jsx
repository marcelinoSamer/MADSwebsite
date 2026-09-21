import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Hero from './Hero'

describe('Hero', () => {
  it('names the association in the page heading', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /mathematics, actuarial & data science association/i,
      }),
    ).toBeInTheDocument()
  })

  // The hero is a masthead, not a campaign: the nav already carries the one
  // call to action, and a second pair here made the page read as marketing.
  it('carries no call-to-action links', () => {
    render(<Hero />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
