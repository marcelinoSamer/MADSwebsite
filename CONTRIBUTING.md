# Contributing to MADSwebsite

## Getting started

npm install
npm run dev


Runs the site locally at `http://localhost:5173` with hot reload.

## Running tests

npm test # run the full test suite once
npm run test:watch # re-run tests automatically as you edit files
npm run test:coverage # run tests and generate a coverage report


Tests run automatically on every Pull Request via GitHub Actions — a PR cannot be merged if any test fails.

## Writing tests

- Every component's test file lives next to it: `Component.jsx` → `Component.test.jsx` (colocated), not in a separate top-level `tests/` folder.
- We use [Vitest](https://vitest.dev/) as the test runner and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) to render and query components.
- **Query by role and accessible name first** — how a real user (or screen reader) would identify the element — not by CSS class or a test-only ID. Use `getByText` only when no element role fits (e.g. plain paragraph text with no semantic role).
- Snapshot tests are discouraged — they pass silently and get blindly regenerated on failure rather than catching real regressions.

### Reference example

See `src/components/Navbar.test.jsx` for the standard pattern:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Navbar from './Navbar'

describe('Navbar', () => {
  it('renders a link to each main section', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument()
  })
})
```

## Mocking network requests

Any component that fetches data should use [MSW](https://mswjs.io/) handlers defined in `src/mocks/handlers.js`, rather than mocking the fetch/axios call directly in the test file.