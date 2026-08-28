import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Hero from './Hero'

describe('Hero', () => {
  it('renders both call-to-action links', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /explore what we do/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /join the community/i })).toBeInTheDocument()
  })
})