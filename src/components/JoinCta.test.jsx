import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import JoinCta from './JoinCta'

describe('JoinCta', () => {
  it('renders the call-to-action heading and join link', () => {
    render(<JoinCta />)
    expect(
      screen.getByRole('heading', { name: /ready to be part of it/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /join now/i })).toBeInTheDocument()
  })
})