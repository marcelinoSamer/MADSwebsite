import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import NormalCurve from './NormalCurve'

// This component is decorative and deliberately hidden from assistive tech,
// so there is no role or accessible name to query by — the exception the
// contributing guide allows.
describe('NormalCurve', () => {
  it('is hidden from the accessibility tree', () => {
    const { container } = render(<NormalCurve />)
    expect(container.querySelector('figure')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders a labelled tick for every standard deviation', () => {
    const { container } = render(<NormalCurve />)
    const labels = [...container.querySelectorAll('.curve-label')].map(
      (node) => node.textContent
    )
    expect(labels).toEqual(['−2σ', '−1σ', 'μ', '1σ', '2σ'])
  })
})
