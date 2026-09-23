import { describe, it, expect, beforeEach } from 'vitest'
import { createMockAdapter, DEV_PASSWORD } from './mockAdapter.js'
import { withMember } from './seed.js'
import { CODES } from './errors.js'
import { PERMISSIONS } from './permissions.js'

/** A client already signed in as a member holding `roleId`. */
async function clientAs(roleId) {
  const client = createMockAdapter({ seed: withMember(roleId) })
  await client.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })
  return client
}

describe('mock adapter', () => {
  let client

  beforeEach(() => {
    client = createMockAdapter()
  })

  describe('auth', () => {
    it('signs in a seeded account and exposes its role', async () => {
      const session = await client.auth.signIn({
        email: 'mads@aucegypt.edu',
        password: DEV_PASSWORD,
      })
      expect(session.user.email).toBe('mads@aucegypt.edu')
      expect(session.role.permissions).toContain(PERMISSIONS.MEMBERS_WRITE)
    })

    it('matches the email case-insensitively', async () => {
      const session = await client.auth.signIn({
        email: '  ADMIN@mads.auc ',
        password: DEV_PASSWORD,
      })
      expect(session.user.fullName).toBe('MADS Admin')
    })

    it('rejects a wrong password without revealing whether the account exists', async () => {
      const unknown = client.auth
        .signIn({ email: 'nobody@mads.auc', password: DEV_PASSWORD })
        .catch((e) => e.message)
      const wrongPassword = client.auth
        .signIn({ email: 'mads@aucegypt.edu', password: 'nope' })
        .catch((e) => e.message)

      expect(await unknown).toBe(await wrongPassword)
    })

    it('notifies listeners on sign in and sign out', async () => {
      const seen = []
      client.auth.onChange((session) => seen.push(session?.user.email ?? null))

      await client.auth.signIn({ email: 'mads@aucegypt.edu', password: DEV_PASSWORD })
      await client.auth.signOut()

      expect(seen).toEqual(['mads@aucegypt.edu', null])
    })
  })

  describe('permissions', () => {
    it('refuses writes when signed out', async () => {
      await expect(client.posts.create({ slug: 'x', title: 'X' })).rejects.toMatchObject({
        code: CODES.NOT_AUTHENTICATED,
      })
    })

    it('lets a Writer draft a post but not publish it', async () => {
      const writer = await clientAs('role-writer')
      const post = await writer.posts.create({ slug: 'draft-me', title: 'Draft me' })

      expect(post.status).toBe('draft')
      await expect(writer.posts.update(post.id, { status: 'published' })).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
    })

    it('lets the Content Head publish, stamping publishedAt once', async () => {
      const content = await clientAs('role-content')
      const created = await content.posts.create({ slug: 'ship-it', title: 'Ship it' })

      const published = await content.posts.update(created.id, { status: 'published' })
      expect(published.publishedAt).not.toBeNull()

      const unpublished = await content.posts.update(published.id, { status: 'draft' })
      expect(unpublished.publishedAt).toBeNull()
    })

    it('hides the subscriber list from a role without that permission', async () => {
      const academics = await clientAs('role-academics')
      await expect(academics.subscribers.list()).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })
  })

  describe('public reads', () => {
    it('returns only published posts, newest first', async () => {
      const posts = await client.posts.list({ status: 'published' })

      expect(posts.every((p) => p.status === 'published')).toBe(true)
      expect(posts.map((p) => p.slug)).toEqual(['datathon-2026-recap', 'actuarial-exam-study-group'])
    })

    it('does not leak drafts through the public list', async () => {
      const posts = await client.posts.list({ status: 'published' })
      expect(posts.find((p) => p.slug === 'spring-speaker-series')).toBeUndefined()
    })
  })

  describe('subscribers', () => {
    it('accepts a new address and normalises it', async () => {
      const row = await client.subscribers.subscribe('  New.Person@AUCegypt.edu ')
      expect(row.email).toBe('new.person@aucegypt.edu')
    })

    it('rejects a malformed address', async () => {
      await expect(client.subscribers.subscribe('not-an-email')).rejects.toMatchObject({
        code: CODES.INVALID,
      })
    })

    it('reactivates a previously unsubscribed address instead of duplicating it', async () => {
      const row = await client.subscribers.subscribe('old@aucegypt.edu')
      expect(row.unsubscribedAt).toBeNull()

      await client.auth.signIn({ email: 'mads@aucegypt.edu', password: DEV_PASSWORD })
      const all = await client.subscribers.list()
      expect(all.filter((s) => s.email === 'old@aucegypt.edu')).toHaveLength(1)
    })
  })

  describe('form submissions', () => {
    it('accepts an anonymous submission to a public form', async () => {
      const form = await client.forms.bySlug('feedback')
      const row = await client.submissions.create(form.id, {
        topic: 'Events',
        message: 'More evening sessions.',
      })

      expect(row.submittedBy).toBeNull()
    })

    it('rejects a submission missing a required field', async () => {
      const form = await client.forms.bySlug('feedback')
      await expect(client.submissions.create(form.id, { topic: 'Events' })).rejects.toMatchObject({
        code: CODES.INVALID,
      })
    })

    it('requires sign-in for an internal form', async () => {
      const form = await client.forms.bySlug('event-proposal')
      await expect(client.submissions.create(form.id, {})).rejects.toMatchObject({
        code: CODES.NOT_AUTHENTICATED,
      })
    })

    // Answering is not an editorial act. A Writer holds neither forms:write
    // nor submissions:read, and still has to be able to ask for a venue.
    it('lets any signed-in member fill an internal form in', async () => {
      const writer = await clientAs('role-writer')
      const form = await writer.forms.bySlug('venue-reservation')

      const row = await writer.submissions.create(form.id, {
        venue: 'Hatem Hall seminar room',
        date: '2026-10-02',
        attendees: 30,
        purpose: 'Study group kickoff.',
      })

      expect(row.submittedBy).toBe('user-test')
    })

    it('still refuses to show that member the answers', async () => {
      const writer = await clientAs('role-writer')
      await expect(writer.submissions.list()).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })

    it('refuses a submission to a closed form', async () => {
      const president = await clientAs('role-president')
      const form = await president.forms.bySlug('venue-reservation')
      await president.forms.update(form.id, { isOpen: false })

      await expect(
        president.submissions.create(form.id, {
          venue: 'Hatem Hall seminar room',
          date: '2026-10-02',
          attendees: 30,
          purpose: 'Study group kickoff.',
        }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })
  })

  describe('form definitions', () => {
    const DRAFT = {
      slug: 'equipment-loan',
      title: 'Equipment loan',
      fields: [{ id: 'f1', name: 'item', label: 'What do you need?', type: 'text', required: true }],
    }

    it('defaults a new form to internal, so nothing reaches the site by accident', async () => {
      const president = await clientAs('role-president')
      const form = await president.forms.create(DRAFT)

      expect(form.audience).toBe('internal')
      expect(form.isOpen).toBe(true)
    })

    it('blocks a member without forms:write from editing one', async () => {
      const writer = await clientAs('role-writer')
      const form = await writer.forms.bySlug('venue-reservation')

      await expect(writer.forms.update(form.id, { audience: 'public' })).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
      await expect(writer.forms.create(DRAFT)).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })

    it('refuses an audience the check constraint would refuse', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.forms.create({ ...DRAFT, audience: 'semi-public' }),
      ).rejects.toMatchObject({ code: CODES.INVALID })
    })

    // Answers are stored keyed by field name, so a duplicate would silently
    // overwrite the other question's answer.
    it('refuses two questions sharing a name', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.forms.create({
          ...DRAFT,
          fields: [
            { id: 'f1', name: 'item', label: 'What do you need?', type: 'text' },
            { id: 'f2', name: 'item', label: 'For how long?', type: 'text' },
          ],
        }),
      ).rejects.toMatchObject({ code: CODES.CONFLICT })
    })

    it('refuses a form with no title rather than storing “undefined”', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.forms.create({ slug: 'equipment-loan' }),
      ).rejects.toMatchObject({ code: CODES.INVALID })
    })

    it('refuses a slug that would not survive a URL', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.forms.create({ ...DRAFT, slug: 'Equipment Loan' }),
      ).rejects.toMatchObject({ code: CODES.INVALID })
    })

    it('refuses a slug another form already holds', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.forms.create({ ...DRAFT, slug: 'venue-reservation' }),
      ).rejects.toMatchObject({ code: CODES.CONFLICT })
    })

    it('publishes a form to the site by flipping its audience', async () => {
      const president = await clientAs('role-president')
      const form = await president.forms.bySlug('venue-reservation')
      const updated = await president.forms.update(form.id, { audience: 'public' })

      expect(updated.audience).toBe('public')
      const listed = await president.forms.list({ audience: 'public' })
      expect(listed.map((f) => f.slug)).toContain('venue-reservation')
    })
  })

  describe('syllabi', () => {
    it('blocks deleting a course that still has syllabi attached', async () => {
      const academics = await clientAs('role-academics')
      await expect(academics.courses.remove('course-1')).rejects.toMatchObject({
        code: CODES.CONFLICT,
      })
    })

    it('exposes a URL for a stored file', async () => {
      const [file] = await client.syllabi.list({ courseId: 'course-1' })
      expect(client.syllabi.publicUrl(file.filePath)).toBe(`/${file.filePath}`)
    })
  })

  it('rejects a duplicate post slug', async () => {
    const content = await clientAs('role-content')
    await expect(
      content.posts.create({ slug: 'datathon-2026-recap', title: 'Clash' }),
    ).rejects.toMatchObject({ code: CODES.CONFLICT })
  })

  it('does not hand out references into its own store', async () => {
    const [first] = await client.posts.list({ status: 'published' })
    first.title = 'mutated by the caller'

    const [again] = await client.posts.list({ status: 'published' })
    expect(again.title).not.toBe('mutated by the caller')
  })
})
