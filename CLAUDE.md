# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Website and admin panel for MADS (AUC Mathematics, Actuarial & Data Science Association). An npm workspace:

```
apps/site       public marketing site + blog + syllabus archive   → mads-auc.org
apps/admin      committee admin panel                             → admin.mads-auc.org
packages/db     data layer: adapter interface, mock, React hooks
packages/brand  brand tokens shared by both apps
```

Both apps are React + Vite SPAs. There is no server in this repo.

## Commands

```bash
npm install            # once, at the root — never inside a workspace
npm run dev            # BOTH apps via concurrently, prefixed [site] / [admin]
                       #   site  → :5173    admin → :5174
npm run dev:site       # just one of them
npm run dev:admin
npm run build          # both apps
npm run lint           # oxlint (not eslint)
npm test               # every workspace once (what CI runs)
npm run test:watch
npm run test:coverage

npx vitest run --project site|admin|db            # one workspace
npx vitest run apps/site/src/components/Navbar.test.jsx
npx vitest run -t "renders a link"
npm i some-package -w @mads/site                  # add a dep to one app
```

CI (`.github/workflows/test.yml`) runs `npm ci && npm test && npm run build` on every PR and on pushes to `main`. Lint is not enforced.

## The backend decision

The backend is a **managed Supabase project** — Postgres, Auth, Storage, RLS — not a server app in this repo. The reasoning, which should survive: the association loses its whole dev team every couple of years, so a VPS someone must patch and back up is a bus-factor event at every graduation; the feature set is ~90% CRUD plus file storage; and granular authorization belongs in RLS, where a forgotten route guard cannot bypass it.

The project is **live**: `mads` in `eu-central-1`, deployed to two Vercel projects (`mads-site`, `mads-admin`) connected to this repo. Schema and policies are in `supabase/migrations/`, applied through the Management API (see README) — there is no Supabase CLI here.

**Authorization is RLS, not client code.** `has_permission(perm)` is a `security definer` helper that joins `profiles → roles`; every policy calls it with the same strings as `permissions.js`. Two things worth knowing before editing policies:

- Publishing is enforced by the `posts_publish_guard` trigger, not a policy — an `UPDATE` policy cannot compare `old.status` to `new.status`. The trigger also stamps `published_at` on first publish and clears it on unpublish, which is why the adapter never sets that column.
- Newsletter sign-up is the `subscribe()` RPC, not an insert. It has to upsert to reactivate an unsubscribed address, and granting `anon` an `UPDATE` policy on `subscribers` would let anyone rewrite rows.
- **Anonymous inserts must not use `.select()`.** A `RETURNING` clause needs a `SELECT` policy, and `anon` deliberately has none on `form_submissions` — a submitter reading that table back would see everyone else's responses. `submissions.create` writes blind and echoes the row locally. This failed silently once; `npm run db:verify` catches it.

Run `npm run db:verify` after any migration. It asserts what anon and admin each *cannot* do, and cleans up after itself.

Settled scope decisions, made deliberately — do not "improve" them without asking:

- **Auth is email + password** via Supabase's own auth. Not AUC SSO — SAML is a paid tier and needs university IT. Two accounts exist, both President; they are created by `scripts/seed-supabase.mjs` from `.env`, never by a migration. A password in a committed migration is a password in git history forever.
- **Syllabi are public.** No login on the public site at all.
- **The newsletter collects sign-ups only.** Nothing sends mail. The admin panel exports CSV so a newsletter can actually go out via whatever tool the board already uses.
- **Posts are stored as markdown** so the editor can become WYSIWYG later without a data migration.

Consequence: **v1 needs no Edge Functions.** Every path is client → Postgres through RLS. The first thing that will need one is CAPTCHA verification, if the anonymous inserts get spammed.

Both real accounts are President, so tests build their own member for a narrower role — `withMember('role-writer')` in `packages/db/src/seed.js`, wrapped by `renderAs(ROLE.writer, …)` in the admin app. Do not add demo people back to the seed.

## Data layer (`packages/db`)

Everything data-related goes through this package. **No component imports a backend client, and none should.**

- `createDataClient({ env })` picks the adapter: Supabase when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, the mock otherwise. The cutover changes the environment, not the code.
- `mockAdapter.js` — in-memory, seeded from `seed.js`, persisted to `localStorage` in the browser. **It enforces permissions on every mutation.** That is deliberate: if the admin UI is built against a permissive mock it will be built wrong, and it will only break after the Supabase cutover.
- `supabaseAdapter.js` — the real backend. Postgres is snake_case and the apps are camelCase; that translation happens here and nowhere else. It contains **no permission checks** — the database refuses, and `toDataError` maps Postgres error codes (`42501`, `23505`, `23503`, `PGRST116`) onto the same `DataError` codes the mock throws, so UI code branches on one set.
- `permissions.js` — permission strings are the contract. They will end up as literals inside SQL policies, so keep them stable. A role is a bag of strings; a user has one role. Adding a committee's permissions must stay a data change, never a migration.
- `seed.js` doubles as the schema reference — flat shapes, ids not nesting, ISO date strings, exactly what PostgREST will return.

### React bindings (`@mads/db/react`)

`DataProvider` · `useData` · `useSession` · `useCan` · `useQuery` · `useAction`.

Two things that will bite if you forget them:

- **`useQuery` re-runs when the session changes**, so permission-gated reads never serve the previous user's rows. Pass anything else the factory closes over in the deps array.
- **`useAction`'s `run` never rejects.** It resolves to `{ ok: true, data }` or `{ ok: false, error }`. Every caller is an event handler, where an uncaught rejection is invisible in the UI and only shows up as an unhandled-rejection warning. Check `.ok` before using `.data`; the error is already rendering from `action.error`.

## Brand

`MADS_Brand_Voice_Guide.pdf` in the repo root is the authority for colour, type, and tone. **Read it before making any visual change.** It has no text layer extractable by `Read`; dump it with a zlib/regex pass over the PDF streams.

Tokens live in `packages/brand/tokens.css` and are imported by both apps. Do not redeclare the palette in an app stylesheet — that is exactly the drift this package exists to prevent.

| Token | Hex | Guide usage |
| --- | --- | --- |
| `--navy` | `#0A3B5E` | Dominant background across all designs |
| `--purple` | `#AE67B7` | Highlight bars, titles, logo |
| `--purple-soft` | `#BB85CE` | Softer accents, illustration elements |
| `--blue` | `#4682B4` | Accent circles, decorative shapes |
| `--blue-accent` | `#6EA0CF` | Highlight bars, button outlines |
| `--neutral` | `#E4E2DD` | Backgrounds, subtle dividers |
| `--off-white` | `#FEFEFE` | Logo text, light contrast details |

Two consequences worth knowing before you "fix" something that looks deliberate:

- **Primary purple never carries small text on navy** — it lands at 2.9:1. Accent *text* uses `--purple-soft` (3.9:1, clears AA Large); primary purple is reserved for bars, rules, and the curve stroke. The solid CTA is off-white-on-navy for the same reason, and only turns purple on hover.
- **Type is Telegraf (titles) + Garet (body).** Both are commercially licensed with no public CDN, so `tokens.css` declares `@font-face` against `/fonts/*.woff2` and the stack falls through to substitutes loaded in each app's `index.html` — Archivo ≈ Telegraf, Jost ≈ Garet. Dropping the licensed `.woff2` files into an app's `public/fonts/` makes it exact with no code change; the build warning about unresolved `/fonts/*.woff2` is expected until then. The guide's *second* pairing (Shrikhand + JetBrains Mono) is scoped to Deal Room materials only — don't use it here.

`--danger` and `--success` are not in the guide (it has no error state) and were derived to sit beside the palette.

Voice, if you touch copy: warm but professional; dates, deadlines, and links isolated on their own line for scannability; emoji sparingly.

## `apps/site`

`main.jsx` mounts `App` under `StrictMode`, inside `BrowserRouter` and `DataProvider`. `App.jsx` composes the fixed `.lattice` backdrop, `Navbar`, a `<Routes>` in `<main>`, and `Footer`.

Routes: `/` (Landing) · `/blog` · `/blog/:slug` · `/syllabi` · `/forms/:slug` · `*`. **Landing is eager; every other route is `lazy()`.** react-markdown is most of the JS on this site and a visitor who only sees the homepage should not download it — don't un-split them.

`pages/Landing.jsx` holds the original section composition: `Hero`/`About`/`Pillars`/`Activities`/`JoinCta`. Section components are still props-less and state-less.

Three shared pieces are not sections:

- `Reveal.jsx` — scroll-entrance wrapper (`motion` + `whileInView`, `once: true`). Takes `as`, `delay`, `y`, spreads the rest. **Don't wrap an element whose descendants rely on `position: sticky`** — the animated transform makes it a containing block and breaks sticky.
- `NormalCurve.jsx` — the hero's signature SVG gaussian, drawn via `pathLength="1"` + `stroke-dashoffset`. Decorative and `aria-hidden`.
- `SectionLink.jsx` — **the one rule for linking to a landing-page section.** On `/` it renders a bare `<a href="#about">` so the browser's native smooth scroll and `scroll-padding-top` handle it exactly as before the router existed. From any other route it renders `<Link to="/#about">`, and `ScrollToTop` resolves the hash once the section mounts. Navbar and Footer both use it; don't hand-roll a third variant.

When adding a section: create `src/components/X.jsx` + colocated `X.test.jsx`, give the `<section>` an `id` if linkable, and wire it into `Landing.jsx` and the `SECTIONS`/`PAGES` lists in `Navbar.jsx` and the `Footer` list.

### Styling

Global class-based CSS, no CSS modules and no utility classes in JSX.

- `packages/brand/tokens.css` — `@font-face` + every brand token. Both apps import it.
- `apps/site/src/App.css` — the site's whole design system. Imports tokens on line 1. Section order mirrors the page.
- `apps/site/src/index.css` — document reset only (`color-scheme: dark`, `scroll-padding-top` to clear the sticky nav, the global reduced-motion clamp). No tokens.

Reduced motion is handled in two places by design: `index.css` collapses all durations globally, and `App.css` has a `prefers-reduced-motion` block that pins *end* states so nothing is left mid-draw or at `opacity: 0`. Any new load animation starting from `opacity: 0` needs an entry there.

### Design conventions

Four patterns carry the site. Reuse them rather than inventing a parallel one.

**Motion has two tiers.** Above the fold is CSS-only: `.rise` sets `opacity: 0` and `.rise-1` … `.rise-4` add `animation-delay` in ~130ms steps, so the hero staggers on load without JS. Everything below the fold uses `<Reveal>`. Don't use `Reveal` in the hero — it would wait for an intersection that already happened. New `.rise-N` steps need a matching `prefers-reduced-motion` entry.

**Hover is one gesture, reused.** A `::before` at `transform: scaleX(0)` with `transform-origin: left`, wiped to `scaleX(1)` over `--ease-ink`. `.btn` and `.nav-links a` wipe purple; `.pillar-row` and `.post-row` wipe `--navy-lift` and bleed past the container via `inset: 0 calc(var(--gutter) * -1)` so the fill reads full-bleed while text stays on the grid. `.activity-row` is the one exception — it steps `padding-left` instead, since a fill would fight the staircase.

**Section rhythm is deliberate.** `hero` and `pillars` have *no* background, so the fixed `.lattice` shows through them; `about` and `join` are `--navy-deep`; `footer` is `--navy-deepest`. `activities` is the single `--neutral` section — one light break in a navy page. Inner routes (`.page-head`, `.page-body`) also have no background, keeping the lattice visible. Adding a second light section flattens the rhythm.

**Breakpoints are per-component, not tokenised** — each lives next to the rules it changes: 880px (nav links drop, the mobile menu button appears), 820px (about grid → one column), 760px (pillar row → two columns), 620px (activity staircase flattens, course row stacks). Sizing otherwise uses `clamp()`.

## `apps/admin`

Same shape — `BrowserRouter` + `DataProvider` — but a different visual register: dense, tabular, no lattice and no scroll-entrance motion. Animation on a form used forty times a day is friction, not craft.

`admin.css` is the whole stylesheet, importing the shared tokens on line 1.

Authorization is three layers, and all three matter:

1. `RequireAuth` — layout route, admits only a signed-in user. It branches explicitly on `loading`, because the session restores asynchronously and treating "no session yet" as "signed out" bounces people who are in fact signed in.
2. `Gate need={[...]}` — wraps each page's body. **A courtesy, not a boundary.** It stops someone being shown a page whose every action will fail.
3. The adapter (later, RLS). The only real enforcement.

`Shell` filters its nav by the same permissions, so nobody navigates into a dead end.

The `PostEditor` loads the post, then mounts the editor **keyed on the post id** with the data as initial state, rather than copying fetched data into state in an effect. Because that remounts on create-navigation, the "Saved." confirmation rides through router state (`location.state.justSaved`).

Forms use `noValidate` and validate in JS. This is not stylistic — jsdom reports a `required` file input as invalid even when a file is attached, so native validation silently blocks submits in tests.

## Testing

Vitest + jsdom + React Testing Library. The root `vitest.config.js` runs each workspace as a project; each owns its environment via its local `vite.config.js`, so `packages/db` isn't forced to boot jsdom.

Conventions are in `CONTRIBUTING.md`. The load-bearing ones:

- Colocated `Component.test.jsx`. Query by role and accessible name.
- Use the per-app `renderWithProviders` / `renderAs(AS.role, …)` helpers — components need a router and a client. Each call gets a fresh seeded adapter, so no reset is needed.
- The helper returns the `client`; assert on what was **stored**, not only what the UI said.
- For empty or odd states, pass a modified `createSeed()` rather than mocking.
- **There is no network mocking and there should not be.** Components talk to `packages/db`. MSW is still a dependency for the day something calls a genuine outside API.

`setupTests.js` in each app pulls in `@testing-library/jest-dom` and stubs `window.scrollTo` / `scrollIntoView` (jsdom implements neither, and route changes call both). The site's also stubs `IntersectionObserver` for Motion's `whileInView`, reporting every element visible so components render settled.

## Deploying

Both apps are static SPAs. Each host must rewrite unknown paths to `index.html`, or `/blog/some-post` 404s on refresh.

## Lint

`.oxlintrc.json` enables the `react` and `oxc` plugins with `react/rules-of-hooks` as an error and `react/only-export-components` as a warning. The remaining warnings in `packages/db/src/react.jsx` are inherent — it is a hooks module that also exports a provider, and `useQuery` necessarily sets state in an effect.
