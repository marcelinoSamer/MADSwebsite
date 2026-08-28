import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the hero heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /where numbers become decisions/i })
    ).toBeInTheDocument()
  })
})