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

CI (`.github/workflows/ci.yml`) runs `npm ci && npm test && npm run build` on every PR and on pushes to `main`; a green run on `main` then deploys both apps to Vercel. Lint is not enforced.

## The backend decision

The backend is a **managed Supabase project** — Postgres, Auth, Storage, RLS — not a server app in this repo. The reasoning, which should survive: the association loses its whole dev team every couple of years, so a VPS someone must patch and back up is a bus-factor event at every graduation; the feature set is ~90% CRUD plus file storage; and granular authorization belongs in RLS, where a forgotten route guard cannot bypass it.

The project is **live**: `mads` in `eu-central-1`, deployed to two Vercel projects (`mads-site`, `mads-admin`). Schema and policies are in `supabase/migrations/`, applied through the Management API (see README) — there is no Supabase CLI here.

Vercel's own Git integration is **not** connected: linking a repo needs an interactive GitHub OAuth connection on the Vercel account, which an API token cannot create. Deployment runs from `.github/workflows/ci.yml` instead, gated on the test job. If someone later connects the repo in the Vercel dashboard, delete the `deploy` job — otherwise every push deploys twice.

**Authorization is RLS, not client code.** `has_permission(perm)` is a `security definer` helper that joins `profiles → roles`; every policy calls it with the same strings as `permissions.js`. Things worth knowing before editing policies:

- Publishing is enforced by the `posts_publish_guard` trigger, not a policy — an `UPDATE` policy cannot compare `old.status` to `new.status`. The trigger also stamps `published_at` on first publish and clears it on unpublish, which is why the adapter never sets that column.
- Newsletter sign-up is the `subscribe()` RPC, not an insert. It has to upsert to reactivate an unsubscribed address, and granting `anon` an `UPDATE` policy on `subscribers` would let anyone rewrite rows.
- **Anonymous inserts must not use `.select()`.** A `RETURNING` clause needs a `SELECT` policy, and `anon` deliberately has none on `form_submissions` — a submitter reading that table back would see everyone else's responses. `submissions.create` writes blind and echoes the row locally. This failed silently once; `npm run db:verify` catches it.
- **Reading a form is not the same as editing one or reading its answers.** `forms_read` (0005) admits `audience = 'public'` to anyone and every other form to any signed-in user — nothing narrower, because an internal form is filled in by whoever needs the thing, not by the committee that processes it. `forms:write` and `submissions:read` gate the two acts that *are* editorial. Before 0005 that policy required one of those two permissions, which left `submissions_insert` in 0001 already permitting a write that nothing could compose: a member could insert an answer to a form they were not allowed to read.
- **One syllabus per course per term**, as a unique index on `syllabi (course_id, term, year)` (0006). The archive lists a course's terms; two rows for the same term give a reader no way to tell which is current. Replacing a file is therefore delete-then-upload, which also takes the old object out of Storage instead of stranding it. The Supabase adapter catches the violation, deletes the bytes it just uploaded, and names the term in the message.
- Member administration adds three more triggers, for the same reason as the publish guard — a policy cannot see what a row is changing *from*. `profiles_role_guard` refuses a self-role-change; `profiles_admin_floor` and `roles_admin_floor` refuse any change that would leave nobody holding `members:write`. The role guard is exempt under the service role (`auth.uid()` is null there), so `db:seed` can still repair an account; the two floors deliberately are not, so they hold for the Edge Function and for a laptop with the service key.

Run `npm run db:verify` after any migration. It asserts what anon and admin each *cannot* do, and cleans up after itself.

Settled scope decisions, made deliberately — do not "improve" them without asking:

- **Auth is email + password** via Supabase's own auth. Not AUC SSO — SAML is a paid tier and needs university IT. Two founding accounts exist, both President; they are created by `scripts/seed-supabase.mjs` from `.env`, never by a migration. A password in a committed migration is a password in git history forever. Everyone after those two is added from the Members page with a temporary password, so the script stays a bootstrap and a password-rotation tool, not the way people get accounts.
- **Syllabi are public.** No login on the public site at all.
- **The newsletter collects sign-ups only.** Nothing sends mail. The admin panel exports CSV so a newsletter can actually go out via whatever tool the board already uses.
- **Posts are stored as markdown** so the editor can become WYSIWYG later without a data migration.
- **A form's `audience` is its public flag, and it defaults to `internal`.** `public` forms render on the site at `/forms/<slug>`; `internal` ones exist only inside the admin panel and are filled in there — venue reservations, event proposals, anything the committee raises against itself. A form reaches the public site because someone chose that, never because they left a field blank.

**There is exactly one Edge Function, and adding a second needs a reason this good.** Every other path in both apps is client → Postgres through RLS, and that is the property worth protecting. `supabase/functions/admin-users/` exists because creating or deleting a row in `auth.users` requires the service-role key, which can never be shipped to a browser — no arrangement of policies substitutes for it. It is **not** a privileged back door: it verifies the caller's JWT and then asks the database, as that user, whether they hold `members:write`, using the same `has_permission()` every policy calls. Anything that *could* be a policy must stay one. (The next genuine candidate is still CAPTCHA verification, if the anonymous inserts get spammed.)

It is deployed separately from the apps — `npx supabase functions deploy admin-users`, see README — so **a change to that file does not ship with a push to `main`.** CI does not deploy it and cannot type-check it either; it is Deno, not part of any workspace.

The two founding accounts are President, so tests build their own member for a narrower role — `withMember('role-writer')` in `packages/db/src/seed.js`, wrapped by `renderAs(ROLE.writer, …)` in the admin app. Do not add demo people back to the seed.

## Data layer (`packages/db`)

Everything data-related goes through this package. **No component imports a backend client, and none should.**

- `createDataClient({ env })` picks the adapter: Supabase when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, the mock otherwise. The cutover changes the environment, not the code.
- `mockAdapter.js` — in-memory, seeded from `seed.js`, persisted to `localStorage` in the browser. **It enforces permissions on every mutation.** That is deliberate: if the admin UI is built against a permissive mock it will be built wrong, and it will only break after the Supabase cutover.
- `supabaseAdapter.js` — the real backend. Postgres is snake_case and the apps are camelCase; that translation happens here and nowhere else. It contains **no permission checks** — the database refuses, and `toDataError` maps Postgres error codes (`42501`, `23505`, `23503`, `23514`, `PGRST116`) onto the same `DataError` codes the mock throws, so UI code branches on one set. `members.create` and `members.remove` are the only two calls in the file that do not go to PostgREST — they invoke the `admin-users` function, which answers in that same `{ code, message }` vocabulary so callers cannot tell.
- `formRules.js` — the rules for a form definition, imported by **both** adapters. It is not a permission check, which is why it lives outside the rule that keeps those out of `supabaseAdapter.js`: it catches what Postgres would reject opaquely (the `audience` check constraint) or accept and quietly corrupt (two questions sharing a `name`, since an answer is stored under its field name). `missingAnswers` is here for the same reason — RLS decides whether you may submit, not what you wrote.
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

`pages/Landing.jsx` is `Hero`/`About`/`Calendar`/`JoinCta` — four sections, deliberately. The page was once five and led with a slogan; it was cut back because everyone on campus already knows the association, so descriptive copy earns nothing and the page's job is to hand over the archives, the schedule, and the sign-up. Section components take no props; all but `Hero` and `JoinCta` are also state-less — those two mount `NewsletterSignup`.

`Calendar.jsx` holds the semester schedule **as a hardcoded array**, because there is no events table in `packages/db` and nothing in the admin panel writes one. The entries currently in it are placeholders. If the board starts editing that file more than a couple of times a semester, that is the signal to give events a table and an admin page, the way posts have one.

**The hero is a directory, not a pitch.** Centred, deliberately small type — the title is set near an `h2` so the marks behind it (watermark, circles, curve) carry the image — then the two archives as a ruled two-up row, then the sign-up form. It has no slogan and no CTA buttons: this is a service site for an association the campus already knows, so the hero's job is to hand over what a visitor came for without scrolling. `NewsletterSignup` therefore renders **twice** on the landing page, which is why its field ids come from `useId` rather than literals.

**The inner routes are documents, not landing-page sections.** `PageHead` is short by design — a highlight bar, an `h1` two steps down from the landing page's display sizes, a lead, and then `.page-toolbar`, the hairline bar that carries counts and filters — because someone opening `/blog` or `/syllabi` came for one particular thing and the content has to start inside the first screen. Don't restore the full-height masthead these pages used to open with.

**Blog and syllabi list in cards, not in ruled rows.** The calendar's hairline rows work for a date and one line about it. A post is a date, a title, and a paragraph; a course is a code, a title, a level, and a set of files — at that height hairlines stop separating anything, and the reader cannot see where one item ends. Both lists are therefore bordered cards on `--navy-deep`, and the newest post takes the full width of the grid as a lead story. `.prose` is also set brighter and a step larger than the rest of the site: `--text-muted` is right for a paragraph under a heading and wrong for eight hundred words of one.

**`.section h2` caps headings at `18ch`**, which is right on the landing page and wrong inside a card that is already the measure. `.post-card h2` and `.course-card h2` both set `max-width: none` — a new card-shaped heading will need the same, or it will break over two lines for no reason.

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

**Hover is one gesture, reused.** A `::before` at `transform: scaleX(0)` with `transform-origin: left`, wiped to `scaleX(1)` over `--ease-ink`. `.btn` and `.nav-links a` wipe purple; `.post-card` wipes `--navy-lift` inside its own border; `.hero-entry` wipes the same lift inside its own ruled cell. It lives on a pseudo-element for a second reason on the cards: `Reveal` animates the element's own `transform`, and a hover transform on the same node would fight it. `.event-row` deliberately has no hover — a calendar row is not a link.

**Section rhythm is deliberate.** `hero` has *no* background, so the fixed `.lattice` shows through it; `about` and `join` are `--navy-deep`; `footer` is `--navy-deepest`. `calendar` is the single `--neutral` section — one light break in a navy page, and it falls on the calendar because that is what people come back to check. Inner routes (`.page-head`, `.page-body`) also have no background, keeping the lattice visible. Adding a second light section flattens the rhythm.

**Nothing brand-coloured carries small text on the Neutral section.** Primary purple lands at 3.0:1 on `--neutral` and Secondary Blue at 3.2:1, so every label, date, and paragraph in `.calendar` is a `color-mix` of `--navy` at 75–78% or darker. The accents there are rules and marks only — the same reasoning as `--purple-soft` on navy.

**Breakpoints are per-component, not tokenised** — each lives next to the rules it changes: 880px (nav links drop, the mobile menu button appears), 900px (the lead post card splits into title / summary columns), 620px (hero entries stack, event row stacks, post navigation stacks). Sizing otherwise uses `clamp()` and `auto-fill` grids guarded with `min(100%, …)`.

## `apps/admin`

Same shape — `BrowserRouter` + `DataProvider` — but a different visual register: dense, tabular, no lattice and no scroll-entrance motion. Animation on a form used forty times a day is friction, not craft.

`admin.css` is the whole stylesheet, importing the shared tokens on line 1.

Authorization is three layers, and all three matter:

1. `RequireAuth` — layout route, admits only a signed-in user. It branches explicitly on `loading`, because the session restores asynchronously and treating "no session yet" as "signed out" bounces people who are in fact signed in.
2. `Gate need={[...]}` — wraps each page's body. **A courtesy, not a boundary.** It stops someone being shown a page whose every action will fail.
3. The adapter (later, RLS). The only real enforcement.

`Shell` filters its nav by the same permissions, so nobody navigates into a dead end.

The `PostEditor` loads the post, then mounts the editor **keyed on the post id** with the data as initial state, rather than copying fetched data into state in an effect. Because that remounts on create-navigation, the "Saved." confirmation rides through router state (`location.state.justSaved`). `FormEditor` is the same shape for the same reason.

### Syllabi

The page owns the **catalogue** as well as the files: a course is added and deleted here, because a syllabus is filed against a course and there was otherwise no way to create one short of a migration. Two things about deleting:

- The foreign key is `on delete restrict`, so the database refuses a course that still has syllabi. The page answers that out loud rather than routing around it — the inline confirmation names how many files are about to go, and on yes it removes each one through `syllabi.remove` (which takes its bytes out of Storage) before deleting the course. Do not make this a cascade in SQL; the loud refusal is the point, and a cascade would leave the objects orphaned in the bucket.
- The row's Remove button is labelled `Remove <code> from the catalogue`, deliberately avoiding the word "course" — every row's visible text is just "Remove", so the accessible name has to disambiguate, and `getByLabelText(/course/i)` has to keep matching the upload form's Course select and nothing else.

`level` is free text with a `datalist` of suggestions, not a select. A board that starts tagging graduate courses gets a new filter on the public archive without a migration; the archive derives its level chips from whatever is actually in the table.

### Forms

Four routes, and which layer guards each is the whole design:

| Route | Guard | Who |
| --- | --- | --- |
| `/forms` | none | everyone signed in |
| `/forms/:id/fill` | none | everyone signed in |
| `/forms/new`, `/forms/:id/edit` | `Gate forms:write` | editors |
| `/forms/:id/submissions` | `Gate submissions:read` | whoever processes the answers |

**Filling a form in is not an editorial act, so it is not behind a `Gate` and `/forms` is not behind one either** — this is the one nav entry in `Shell` with `need: []`. A venue reservation is raised by whoever needs the venue, which includes the president and includes a Writer whose role grants nothing else in the panel. The list varies its own actions instead: Fill in for everyone, Responses on `submissions:read`, Edit/Close/New on `forms:write`. A role that cannot reopen a closed form is not shown closed forms at all, on the same reasoning as `Shell` hiding dead-end nav.

`FormEditor` is a field builder, so a new form is a row written from the panel rather than an edit to `seed.js` and a migration. A field's `name` follows its label until someone edits it by hand — after that it is theirs, because renaming a field orphans every answer already stored under the old key. Same rule as a post's slug, and `FieldRow` tracks it with the same `nameTouched` flag.

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
