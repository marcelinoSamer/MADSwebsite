# Contributing to MADS

## Getting started

```bash
npm install
npm run dev          # both apps, prefixed [site] / [admin]
#   site  → http://localhost:5173
#   admin → http://localhost:5174

npm run dev:site     # just one of them
npm run dev:admin
```

Ports are strict: a clash fails the command instead of silently moving the app
to another port, which otherwise leaves you testing the wrong one.

This is an npm workspace. Install once at the root — never inside `apps/*` or
`packages/*`. To add a dependency to one app:

```bash
npm i some-package -w @mads/site
```

Shared tooling (vitest, testing-library, oxlint, vite) lives in the root
`package.json` so every workspace uses the same version.

## Running tests

```bash
npm test               # every workspace, once — what CI runs
npm run test:watch
npm run test:coverage

npx vitest run --project site     # one workspace
npx vitest run --project admin
npx vitest run --project db

npx vitest run apps/site/src/components/Navbar.test.jsx   # one file
npx vitest run -t "renders a link"                        # one test by name
```

Tests and the production build both run on every PR via GitHub Actions. A PR
cannot be merged if either fails.

## Writing tests

- Test files live next to what they test: `Component.jsx` → `Component.test.jsx`.
- **Query by role and accessible name** — how a real user or a screen reader
  would find the element — not by CSS class or a test-only id. Fall back to
  `getByText` only for content with no semantic role.
- Snapshot tests are discouraged. They pass silently and get regenerated on
  failure rather than catching regressions.

### Rendering components

Neither app's components work standalone: they need a router and a data client.
Each app has a helper for that.

```jsx
// apps/site
import { renderWithProviders } from '../test/renderWithProviders'

renderWithProviders(<Blog />)
renderWithProviders(<App />, { route: '/blog/some-slug' })
```

```jsx
// apps/admin — most of it is unreachable signed out, so tests pick a role
import { renderAs, AS } from '../test/renderWithProviders'

await renderAs(AS.writer, <App />, { route: '/posts' })
```

Every call gets a **fresh in-memory adapter**, seeded from
`packages/db/src/seed.js`. Tests never share state and never need to reset one.
The helper returns the client, so you can assert on what was actually stored
rather than only on what the UI said:

```jsx
const { client } = renderWithProviders(<JoinCta />)
// …interact…
const subscribers = await client.subscribers.list()
```

To test an empty or unusual state, pass a modified seed:

```jsx
const seed = createSeed()
seed.posts = []
renderWithProviders(<Blog />, { client: createMockAdapter({ seed }) })
```

### Permissions

The mock adapter enforces permissions the way RLS will. A test that signs in as
`AS.writer` and expects to publish a post **should** fail — that is the point.
When adding an admin feature, add a test for the role that must not have it.

### Network mocking

There is none, and there should not be. Components talk to `packages/db`, not to
`fetch`. Swap the adapter or the seed instead. MSW is still a dependency for the
day something genuinely calls an outside API.

## Style

- `npm run lint` (oxlint). Warnings are tolerated; errors are not.
- No TypeScript. The data shapes are documented in `packages/db/src/seed.js`.
- CSS is hand-written and class-based — no CSS modules, no utility classes in
  JSX. See `CLAUDE.md` for where each stylesheet's boundaries are.
