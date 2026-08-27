import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Pillars from './Pillars'

describe('Pillars', () => {
  it('renders all four discipline headings', () => {
    render(<Pillars />)
    expect(screen.getByRole('heading', { name: /mathematics/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /actuarial science/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /data science/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /applied analysis/i })).toBeInTheDocument()
  })
})