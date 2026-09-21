#!/usr/bin/env node
/**
 * End-to-end check against the real Supabase project.
 *
 *   node scripts/verify-supabase.mjs
 *
 * Exercises the paths that RLS decides, as both an anonymous visitor and a
 * signed-in admin, and cleans up everything it creates. Worth running after
 * any migration — a broken policy is invisible until someone hits it.
 */
import { createDataClient } from '@mads/db'
import { loadEnv, require_ } from './loadEnv.mjs'

const env = loadEnv()
const cfg = require_(env, 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY')

const anon = createDataClient({ env: cfg })
const admin = createDataClient({ env: cfg })

let failures = 0
const stamp = Date.now()
const slug = `verify-${stamp}`
const probeEmail = `verify+${stamp}@aucegypt.edu`
const probeMessage = `Verification run ${stamp}.`

async function check(label, fn) {
  try {
    await fn()
    console.log(`  ✓ ${label}`)
  } catch (error) {
    failures += 1
    console.log(`  ✗ ${label}\n      ${error.message}`)
  }
}

/** Assert that `fn` is refused — proving a policy denies, not just allows. */
async function refuses(label, fn) {
  await check(label, async () => {
    let denied = false
    try {
      const result = await fn()
      // PostgREST returns an empty set rather than an error when a SELECT
      // policy filters everything out, so treat [] as a refusal too.
      denied = Array.isArray(result) && result.length === 0
    } catch {
      denied = true
    }
    if (!denied) throw new Error('was allowed but should have been refused')
  })
}

console.log(`\nProject: ${cfg.VITE_SUPABASE_URL}`)

console.log('\nAnonymous visitor:')
await check('reads published posts', () => anon.posts.list({ status: 'published' }))
await check('reads the course catalogue', async () => {
  const courses = await anon.courses.list()
  if (!courses.length) throw new Error('no courses seeded')
})
await check('reads the public feedback form', () => anon.forms.bySlug('feedback'))
await check('subscribes to the newsletter', () => anon.subscribers.subscribe(probeEmail))
await check('submits the feedback form', async () => {
  const form = await anon.forms.bySlug('feedback')
  await anon.submissions.create(form.id, { topic: 'Events', message: probeMessage })
})
await refuses('cannot read the subscriber list', () => anon.subscribers.list())
await refuses('cannot read form responses', () => anon.submissions.list())
await refuses('cannot read the member roster', () => anon.members.list())
await refuses('cannot create a post', () => anon.posts.create({ slug, title: 'Nope' }))

console.log('\nSigned-in admin:')
await check('signs in', async () => {
  const session = await admin.auth.signIn({
    email: env.MADS_EMAIL,
    password: env.MADS_PASSWORD,
  })
  if (!session?.role) throw new Error('signed in but no role resolved')
  if (session.role.permissions.length !== 8) {
    throw new Error(`expected 8 permissions, got ${session.role.permissions.length}`)
  }
})

let postId = null
await check('creates a draft', async () => {
  const post = await admin.posts.create({ slug, title: 'Verification post', bodyMd: '## Hello' })
  postId = post.id
  if (post.status !== 'draft') throw new Error(`expected draft, got ${post.status}`)
})

await check('publishes it, and the trigger stamps published_at', async () => {
  const post = await admin.posts.update(postId, { status: 'published' })
  if (!post.publishedAt) throw new Error('published_at was not set')
})

await check('the published post is visible anonymously', async () => {
  const post = await anon.posts.bySlug(slug)
  if (post.id !== postId) throw new Error('anon saw a different row')
})

await check('unpublishing clears published_at', async () => {
  const post = await admin.posts.update(postId, { status: 'draft' })
  if (post.publishedAt) throw new Error('published_at survived unpublish')
})

await refuses('the draft is hidden from anonymous readers', () => anon.posts.bySlug(slug))
await check('reads the subscriber list', () => admin.subscribers.list())
await check('reads form responses', () => admin.submissions.list())
await check('reads the member roster', async () => {
  const members = await admin.members.list()
  if (members.length < 2) throw new Error(`expected 2 accounts, got ${members.length}`)
})

console.log('\nCleanup:')
await check('deletes the verification post', () => admin.posts.remove(postId))

await check('removes the probe subscriber', async () => {
  const all = await admin.subscribers.list()
  const probe = all.find((s) => s.email === probeEmail.toLowerCase())
  if (probe) await admin.subscribers.remove(probe.id)
})

// No delete method on submissions — responses are meant to be durable — so
// this goes through the underlying client directly.
await check('removes the probe submission', async () => {
  const { error } = await admin.client
    .from('form_submissions')
    .delete()
    .eq('payload->>message', probeMessage)
  if (error) throw error
})

await admin.auth.signOut()

console.log(
  failures ? `\n${failures} check(s) FAILED\n` : '\nAll checks passed.\n',
)
process.exit(failures ? 1 : 0)
