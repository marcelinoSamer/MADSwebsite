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
Both are President — full access. Change a role under **Members**, or rotate a
password by editing `.env` and re-running `npm run db:seed`.

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
