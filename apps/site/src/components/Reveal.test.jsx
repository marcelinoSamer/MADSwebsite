import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Reveal from './Reveal'

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal>revealed content</Reveal>)
    expect(screen.getByText('revealed content')).toBeInTheDocument()
  })

  it('renders the element requested via the `as` prop', () => {
    render(
      <Reveal as="section" aria-label="wrapped section">
        inner
      </Reveal>
    )
    expect(screen.getByRole('region', { name: /wrapped section/i })).toBeInTheDocument()
  })
})
