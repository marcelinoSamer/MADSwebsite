import { describe, it, expect, beforeEach } from 'vitest'
import { createMockAdapter, DEV_PASSWORD } from './mockAdapter.js'
import { withMember } from './seed.js'
import { CODES } from './errors.js'
import { PERMISSIONS, PRESIDENT_ROLE_ID } from './permissions.js'

/**
 * A client already signed in as a member holding `roleId`.
 *
 * The President is one fixed account, not a role anyone can be handed, so
 * asking for it signs in as that account. The seed still carries the extra
 * test member (as a Writer) so the roster has the same shape either way.
 */
async function clientAs(roleId) {
  const president = roleId === PRESIDENT_ROLE_ID
  const client = createMockAdapter({ seed: withMember(president ? 'role-writer' : roleId) })
  await client.auth.signIn({
    email: president ? 'mads@aucegypt.edu' : 'test@mads.auc',
    password: DEV_PASSWORD,
  })
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

    it('deletes a course once nothing is filed against it', async () => {
      const academics = await clientAs('role-academics')
      await academics.courses.remove('course-3')

      const codes = (await academics.courses.list()).map((c) => c.code)
      expect(codes).not.toContain('MACT 3231')
    })

    it('refuses a course code already in the catalogue, whatever its case', async () => {
      const academics = await clientAs('role-academics')
      await expect(
        academics.courses.create({ code: 'mact 2123', title: 'Probability Theory' }),
      ).rejects.toMatchObject({ code: CODES.CONFLICT })
    })

    // The database has a unique index on (course_id, term, year); without the
    // same guard here the admin panel would look like it worked against the
    // mock and fail after the cutover.
    it('allows only one syllabus per course per term', async () => {
      const academics = await clientAs('role-academics')
      await expect(
        academics.syllabi.create({
          courseId: 'course-1',
          term: 'Fall',
          year: 2026,
          fileName: 'MACT2123-Fall2026-v2.pdf',
        }),
      ).rejects.toMatchObject({ code: CODES.CONFLICT })
    })

    it('takes the same file for a different term', async () => {
      const academics = await clientAs('role-academics')
      const row = await academics.syllabi.create({
        courseId: 'course-1',
        term: 'Spring',
        year: 2026,
        fileName: 'MACT2123-Spring2026.pdf',
      })
      expect(row).toMatchObject({ term: 'Spring', year: 2026 })
    })

    it('exposes a URL for a stored file', async () => {
      const [file] = await client.syllabi.list({ courseId: 'course-1' })
      expect(client.syllabi.publicUrl(file.filePath)).toBe(`/${file.filePath}`)
    })
  })

  describe('members', () => {
    const NEW_MEMBER = {
      fullName: 'Nour Hassan',
      email: 'Nour@AUCegypt.edu',
      roleId: 'role-writer',
      password: 'temporary-one',
    }

    it('lets members:write add an account, normalising the address', async () => {
      const president = await clientAs('role-president')
      const member = await president.members.create(NEW_MEMBER)

      expect(member.email).toBe('nour@aucegypt.edu')
      expect(member.roleId).toBe('role-writer')
      expect(await president.members.list()).toHaveLength(4)
    })

    it('refuses an account for an address that already has one', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.members.create({ ...NEW_MEMBER, email: 'MADS@aucegypt.edu' }),
      ).rejects.toMatchObject({ code: CODES.CONFLICT })
    })

    it('refuses a temporary password that is too short to be worth setting', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.members.create({ ...NEW_MEMBER, password: 'short' }),
      ).rejects.toMatchObject({ code: CODES.INVALID })
    })

    it('refuses a role that does not exist', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.members.create({ ...NEW_MEMBER, roleId: 'role-supreme-leader' }),
      ).rejects.toMatchObject({ code: CODES.NOT_FOUND })
    })

    it('keeps a role that cannot manage members out of all of it', async () => {
      const content = await clientAs('role-content')

      await expect(content.members.create(NEW_MEMBER)).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
      await expect(content.members.remove('user-mads')).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
    })

    it('deletes an account without taking their posts with it', async () => {
      const president = await clientAs('role-president')
      await president.members.remove('user-admin')

      expect((await president.members.list()).some((m) => m.id === 'user-admin')).toBe(false)
      const post = await president.posts.byId('post-3')
      expect(post.authorId).toBeNull()
    })

    it('will not let you delete or demote yourself', async () => {
      const president = await clientAs('role-president')
      const [me] = (await president.members.list()).filter((m) => m.id === 'user-mads')

      await expect(president.members.remove(me.id)).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
      await expect(
        president.members.update(me.id, { roleId: 'role-writer' }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })

    it('renames a member but leaves their email and super flag alone', async () => {
      const president = await clientAs('role-president')
      const member = await president.members.update('user-test', {
        fullName: '  Nour Hassan ',
        email: 'elsewhere@example.com',
        isSuper: true,
      })

      expect(member).toMatchObject({ fullName: 'Nour Hassan', email: 'test@mads.auc', isSuper: false })
    })

    it('keeps the President role for the President alone', async () => {
      const president = await clientAs('role-president')

      await expect(
        president.members.update('user-admin', { roleId: PRESIDENT_ROLE_ID }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
      await expect(
        president.members.create({ ...NEW_MEMBER, roleId: PRESIDENT_ROLE_ID }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })
  })

  describe('roles', () => {
    it('lists the President first', async () => {
      const [first] = await client.roles.list()
      expect(first.id).toBe(PRESIDENT_ROLE_ID)
    })

    it('lets the President create a role and decide what it can do', async () => {
      const president = await clientAs('role-president')
      const role = await president.roles.create({
        name: 'Outreach Head',
        description: 'Partnerships.',
        permissions: [PERMISSIONS.EVENTS_WRITE, PERMISSIONS.FORMS_WRITE],
      })

      expect(role.id).toMatch(/^role-/)
      const updated = await president.roles.update(role.id, {
        permissions: [PERMISSIONS.EVENTS_WRITE],
      })
      expect(updated.permissions).toEqual([PERMISSIONS.EVENTS_WRITE])
    })

    it('grants a member exactly what their role carries, as soon as it changes', async () => {
      const president = await clientAs('role-president')
      await president.roles.update('role-writer', {
        permissions: [PERMISSIONS.POSTS_READ, PERMISSIONS.EVENTS_WRITE],
      })

      const writer = await clientAs('role-writer')
      // A fresh client from the same seed would not see the change, so the
      // writer signs in on the President's store.
      await president.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })
      await expect(
        president.events.create({ title: 'Study night', date: '2026-12-01' }),
      ).resolves.toMatchObject({ title: 'Study night' })
      await expect(
        writer.events.create({ title: 'Study night', date: '2026-12-01' }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })

    it('refuses a duplicate name', async () => {
      const president = await clientAs('role-president')
      await expect(president.roles.create({ name: 'writer' })).rejects.toMatchObject({
        code: CODES.CONFLICT,
      })
    })

    it('never hands member management to another role', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.roles.update('role-writer', { permissions: [PERMISSIONS.MEMBERS_WRITE] }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
      await expect(
        president.roles.create({ name: 'Deputy', permissions: [PERMISSIONS.MEMBERS_WRITE] }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })

    it('will not edit or delete the President role', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.roles.update(PRESIDENT_ROLE_ID, { permissions: [PERMISSIONS.POSTS_READ] }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
      await expect(president.roles.remove(PRESIDENT_ROLE_ID)).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
    })

    it('deletes a role only once nobody holds it', async () => {
      const president = await clientAs('role-president')
      await expect(president.roles.remove('role-writer')).rejects.toMatchObject({
        code: CODES.CONFLICT,
      })

      await president.members.update('user-test', { roleId: 'role-content' })
      await president.roles.remove('role-writer')
      expect((await president.roles.list()).some((r) => r.id === 'role-writer')).toBe(false)
    })

    it('keeps roles out of reach of everyone else', async () => {
      const vp = await clientAs('role-vice-president')
      await expect(vp.roles.create({ name: 'Mine' })).rejects.toMatchObject({
        code: CODES.FORBIDDEN,
      })
      await expect(
        vp.roles.update('role-vice-president', { permissions: [] }),
      ).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })
  })

  describe('events', () => {
    it('shows visitors public events only, in date order', async () => {
      const events = await client.events.list()
      expect(events.every((e) => e.isPublic)).toBe(true)
      expect(events.map((e) => e.date)).toEqual([...events.map((e) => e.date)].sort())
    })

    it('shows a signed-in member the private ones too', async () => {
      const writer = await clientAs('role-writer')
      expect((await writer.events.list()).some((e) => !e.isPublic)).toBe(true)
    })

    it('filters by date range, keeping a multi-day event that is still running', async () => {
      const events = await client.events.list({ from: '2026-11-08', to: '2026-11-30' })
      expect(events.map((e) => e.title)).toEqual(['Datathon'])
    })

    it('lets events:write add, edit and remove an event', async () => {
      const events = await clientAs('role-events')
      const created = await events.events.create({
        title: ' Study night ',
        date: '2026-12-01',
        startTime: '18:00',
        endTime: '',
      })
      expect(created).toMatchObject({ title: 'Study night', endTime: null, isPublic: true })

      const moved = await events.events.update(created.id, { date: '2026-12-02' })
      expect(moved.date).toBe('2026-12-02')

      await events.events.remove(created.id)
      await expect(events.events.byId(created.id)).rejects.toMatchObject({ code: CODES.NOT_FOUND })
    })

    it('refuses an event that ends before it starts', async () => {
      const events = await clientAs('role-events')
      await expect(
        events.events.create({ title: 'Backwards', date: '2026-12-02', endDate: '2026-12-01' }),
      ).rejects.toMatchObject({ code: CODES.INVALID })
      await expect(
        events.events.update('event-1', { endTime: '16:00' }),
      ).rejects.toMatchObject({ code: CODES.INVALID })
    })

    it('keeps a role without events:write from changing the calendar', async () => {
      const writer = await clientAs('role-writer')
      await expect(writer.events.remove('event-1')).rejects.toMatchObject({ code: CODES.FORBIDDEN })
    })
  })

  describe('form rules', () => {
    const base = { title: 'Poll', slug: 'poll' }
    const ask = (field) => ({ ...base, fields: [{ id: 'q', name: 'q', label: 'Q', ...field }] })

    it('needs options on every choice type, and no option twice', async () => {
      const president = await clientAs('role-president')
      for (const type of ['radio', 'checkbox', 'select']) {
        await expect(president.forms.create(ask({ type, options: [] }))).rejects.toMatchObject({
          code: CODES.INVALID,
        })
      }
      await expect(
        president.forms.create(ask({ type: 'radio', options: ['A', 'A'] })),
      ).rejects.toMatchObject({ code: CODES.INVALID })
    })

    it('keeps a linear scale inside Google Forms’ bounds', async () => {
      const president = await clientAs('role-president')
      await expect(
        president.forms.create(ask({ type: 'scale', scaleMin: 1, scaleMax: 11 })),
      ).rejects.toMatchObject({ code: CODES.INVALID })
      await expect(
        president.forms.create(ask({ type: 'scale', scaleMin: 0, scaleMax: 10 })),
      ).resolves.toMatchObject({ slug: 'poll' })
    })

    it('refuses a type the renderers cannot draw', async () => {
      const president = await clientAs('role-president')
      await expect(president.forms.create(ask({ type: 'file' }))).rejects.toMatchObject({
        code: CODES.INVALID,
      })
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
