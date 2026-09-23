# MADS

Website and admin panel for MADS — the AUC Mathematics, Actuarial & Data Science Association.

## Layout

An npm workspace with two apps and two shared packages:

```
apps/site      the public marketing site + blog + syllabus archive  → mads-auc.org
apps/admin     the committee admin panel                            → admin.mads-auc.org
packages/db    the data layer: adapter interface, mock, React hooks
packages/brand brand tokens shared by both apps
```

There is no server in this repo. The backend is a managed Supabase project —
Postgres, Auth, Storage, and row-level security — and the decision behind that
is written up in `CLAUDE.md`.

## Live

| | |
| --- | --- |
| Site | https://mads-site-six.vercel.app |
| Admin | https://mads-admin-psi.vercel.app |
| Supabase | project `mads`, `eu-central-1` |

Admin sign-in uses the two accounts in `.env` (`MADS_EMAIL` / `ADMIN_EMAIL`).
Both are President — full access. Everyone else is added from the panel itself,
under **Members**; see [Managing accounts](#managing-accounts). Rotate one of the
two founding passwords by editing `.env` and re-running `npm run db:seed`.

## Running it

```bash
npm install
cp .env.example .env   # then fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev            # both apps
#   site  → http://localhost:5173
#   admin → http://localhost:5174
```

With those two values set, dev runs against the real Supabase project. Leave
them blank and both apps fall back to an in-memory mock seeded with sample
content — useful for working offline or on the UI alone.

Output is prefixed `[site]` / `[admin]`, and one Ctrl-C stops both. To run just
one: `npm run dev:site` or `npm run dev:admin`.

Ports are strict — if something else is already on 5173 or 5174 the command
fails rather than quietly starting on a different port.

On the mock, sign in as `mads@aucegypt.edu` with password `mads`. Mock data
persists in `localStorage`; clear site data to reset it.

```bash
npm test             # every workspace, once (what CI runs)
npm run test:watch
npm run build        # builds both apps
npm run lint
```

## The backend

Nothing in either app imports Supabase. They call `packages/db`, which picks an
adapter at startup:

```js
createDataClient({ env: import.meta.env })
// VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY present → Supabase
// otherwise                                          → in-memory mock
```

Schema and policies live in `supabase/migrations/`. **Authorization is enforced
in row-level security, not in the client** — the admin panel's route guards only
decide what to render. Policies are built from the same permission strings as
`packages/db/src/permissions.js`, so the two stay in step.

```bash
npm run db:seed      # create/repair the admin accounts from .env
npm run db:verify    # end-to-end check of every RLS path, cleans up after itself
```

`db:verify` is worth running after any migration. It signs in as both an
anonymous visitor and an admin and asserts what each one *cannot* do — a broken
policy is invisible until someone hits it.

### Applying a migration

There is no Supabase CLI in this repo. Migrations are applied through the
Management API:

```bash
set -a; source .env; set +a
python3 -c "import json;print(json.dumps({'query':open('supabase/migrations/0003_x.sql').read()}))" > /tmp/q.json
curl -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/q.json
```

Write migrations idempotently (`create ... if not exists`, `drop policy if
exists`) so re-running is harmless.

### Managing accounts

A President manages the whole roster from **Members**: add someone with a role
and a temporary password, change anyone's role, delete an account outright.

Changing a role is a plain `UPDATE` through RLS. Adding and deleting are not —
they write to `auth.users`, which only the service-role key may touch, and that
key can never reach a browser. So those two go through one Edge Function,
`supabase/functions/admin-users/`, which verifies the caller's JWT and re-checks
`has_permission('members:write')` **in the database, as that user**, before it
uses the key. It is a way around the key, not around RLS.

It has to be deployed once, and again whenever that file changes:

```bash
set -a; source .env; set +a
SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN \
  npx supabase@latest functions deploy admin-users --project-ref $SUPABASE_PROJECT_REF
```

`npx` rather than a dependency — nothing in the repo needs the CLI otherwise,
and this is the one job the Management API's SQL endpoint cannot do. No secrets
to configure: `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
are injected into every function automatically.

Two rules sit under all of this, as triggers in `0004_member_admin.sql` rather
than in the function, so they hold on any path into the database:

- **Nobody changes their own role.** Demoting yourself locks you out of the page
  that could undo it.
- **Someone must always hold `members:write`** — enforced on deleting a profile,
  on demoting one, and on editing the permission list of the last role that
  carries it. Without this floor, recovery means a service-role key on a laptop.

`npm run db:verify` exercises all of it, including the function, and deletes the
account it creates.

## Deploying

Both apps are static SPAs on Vercel, one project each, connected to this repo —
a push to `main` redeploys. `vercel.json` in each app supplies the SPA rewrite
(without it `/blog/some-post` 404s on refresh) and the cache and security
headers; the admin panel additionally sends `X-Robots-Tag: noindex`.

`VITE_*` values are inlined at build time, so they are set on the Vercel
projects as well as in `.env`.

## Contributing

See `CONTRIBUTING.md` for the testing conventions, and `CLAUDE.md` for the
architecture and brand rules.
