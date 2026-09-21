import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Activities from './Activities'

describe('Activities', () => {
  it('renders all four activity descriptions', () => {
    render(<Activities />)
    expect(screen.getByText(/industry talks/i)).toBeInTheDocument()
    expect(screen.getByText(/math and case competitions/i)).toBeInTheDocument()
    expect(screen.getByText(/hands-on workshops/i)).toBeInTheDocument()
    expect(screen.getByText(/shares opportunities/i)).toBeInTheDocument()
  })
})