import { createSeed } from './seed.js'
import { can, PERMISSIONS } from './permissions.js'
import { checkForm, missingAnswers } from './formRules.js'
import { DataError, CODES } from './errors.js'

const STORAGE_KEY = 'mads.mock.db'

/** Password for every seeded account while there is no real auth provider. */
export const DEV_PASSWORD = 'mads'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Shortest password the Edge Function will accept, mirrored here so the mock
 * refuses what the real backend would. Supabase's own floor is 6; this is the
 * project's, and the admin panel states it on the form.
 */
export const MIN_PASSWORD_LENGTH = 10

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)))
const newId = () => globalThis.crypto.randomUUID()
const now = () => new Date().toISOString()

/**
 * In-memory implementation of the data interface.
 *
 * It enforces permissions on every mutation rather than trusting the caller.
 * That is deliberate: the real backend will enforce them in RLS, so if the
 * admin UI is built against a permissive mock it will be built wrong, and the
 * failures will only show up after the Supabase cutover.
 */
export function createMockAdapter({ latency = 0, storage = null, seed } = {}) {
  let db = load()
  let session = loadSession()
  const listeners = new Set()

  function load() {
    if (storage) {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        try {
          return JSON.parse(raw)
        } catch {
          // Corrupt or stale shape — fall through and reseed.
        }
      }
    }
    return seed ? clone(seed) : createSeed()
  }

  function loadSession() {
    if (!storage) return null
    const raw = storage.getItem(`${STORAGE_KEY}.session`)
    return raw ? JSON.parse(raw) : null
  }

  function persist() {
    if (!storage) return
    storage.setItem(STORAGE_KEY, JSON.stringify(db))
    if (session) storage.setItem(`${STORAGE_KEY}.session`, JSON.stringify(session))
    else storage.removeItem(`${STORAGE_KEY}.session`)
  }

  const wait = () => (latency ? new Promise((r) => setTimeout(r, latency)) : Promise.resolve())

  async function read(fn) {
    await wait()
    return clone(fn())
  }

  async function write(fn) {
    await wait()
    const result = fn()
    persist()
    return clone(result)
  }

  function currentUser() {
    if (!session) return null
    return db.members.find((m) => m.id === session.userId) ?? null
  }

  function currentRole() {
    const user = currentUser()
    return user ? (db.roles.find((r) => r.id === user.roleId) ?? null) : null
  }

  /** Throws unless the signed-in user's role grants every listed permission. */
  function requirePermission(...permissions) {
    const user = currentUser()
    if (!user) throw new DataError(CODES.NOT_AUTHENTICATED, 'You are not signed in.')
    const role = currentRole()
    if (!can(role, ...permissions)) {
      throw new DataError(CODES.FORBIDDEN, `Your role does not allow: ${permissions.join(', ')}.`)
    }
    return user
  }

  function find(collection, id) {
    const row = db[collection].find((r) => r.id === id)
    if (!row) throw new DataError(CODES.NOT_FOUND, `No ${collection} row with id ${id}.`)
    return row
  }

  function emit() {
    const snapshot = sessionView()
    listeners.forEach((fn) => fn(snapshot))
  }

  function sessionView() {
    const user = currentUser()
    if (!user) return null
    return clone({ user, role: currentRole() })
  }

  const auth = {
    async signIn({ email, password }) {
      await wait()
      const user = db.members.find((m) => m.email.toLowerCase() === String(email).trim().toLowerCase())
      // Same message for unknown email and wrong password — do not confirm
      // which accounts exist to someone guessing.
      if (!user || password !== DEV_PASSWORD) {
        throw new DataError(CODES.NOT_AUTHENTICATED, 'That email and password do not match an account.')
      }
      session = { userId: user.id }
      persist()
      emit()
      return sessionView()
    },

    async signOut() {
      await wait()
      session = null
      persist()
      emit()
      return null
    },

    getSession: () => Promise.resolve(sessionView()),

    /** Returns an unsubscribe function, matching supabase-js's onAuthStateChange. */
    onChange(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }

  const posts = {
    /** `status: 'published'` is the only thing the public site ever asks for. */
    list: ({ status } = {}) =>
      read(() =>
        db.posts
          .filter((p) => (status ? p.status === status : true))
          .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)),
      ),

    bySlug: (slug) =>
      read(() => {
        const post = db.posts.find((p) => p.slug === slug)
        if (!post) throw new DataError(CODES.NOT_FOUND, `No post with slug "${slug}".`)
        return post
      }),

    byId: (id) => read(() => find('posts', id)),

    create: (input) =>
      write(() => {
        const user = requirePermission(PERMISSIONS.POSTS_WRITE)
        if (db.posts.some((p) => p.slug === input.slug)) {
          throw new DataError(CODES.CONFLICT, `A post with the slug "${input.slug}" already exists.`)
        }
        const post = {
          id: newId(),
          slug: input.slug,
          title: input.title,
          excerpt: input.excerpt ?? '',
          bodyMd: input.bodyMd ?? '',
          status: 'draft',
          publishedAt: null,
          authorId: user.id,
          createdAt: now(),
          updatedAt: now(),
        }
        db.posts.push(post)
        return post
      }),

    update: (id, patch) =>
      write(() => {
        requirePermission(PERMISSIONS.POSTS_WRITE)
        const post = find('posts', id)
        if (patch.slug && patch.slug !== post.slug && db.posts.some((p) => p.slug === patch.slug)) {
          throw new DataError(CODES.CONFLICT, `A post with the slug "${patch.slug}" already exists.`)
        }
        // Publishing is a separate permission from editing, so a Writer can
        // prepare a post but not push it live.
        if (patch.status && patch.status !== post.status) {
          requirePermission(PERMISSIONS.POSTS_PUBLISH)
          patch.publishedAt = patch.status === 'published' ? (post.publishedAt ?? now()) : null
        }
        Object.assign(post, patch, { updatedAt: now() })
        return post
      }),

    remove: (id) =>
      write(() => {
        requirePermission(PERMISSIONS.POSTS_WRITE)
        const post = find('posts', id)
        db.posts = db.posts.filter((p) => p.id !== id)
        return post
      }),
  }

  const courses = {
    list: () => read(() => [...db.courses].sort((a, b) => a.code.localeCompare(b.code))),

    create: (input) =>
      write(() => {
        requirePermission(PERMISSIONS.SYLLABI_WRITE)
        const code = String(input.code ?? '').trim()
        const title = String(input.title ?? '').trim()
        if (!code) throw new DataError(CODES.INVALID, 'Give the course a code.')
        if (!title) throw new DataError(CODES.INVALID, 'Give the course a title.')
        if (db.courses.some((c) => c.code.toLowerCase() === code.toLowerCase())) {
          throw new DataError(CODES.CONFLICT, `${code} is already in the catalogue.`)
        }
        const course = { id: newId(), code, title, level: String(input.level ?? '').trim() }
        db.courses.push(course)
        return course
      }),

    remove: (id) =>
      write(() => {
        requirePermission(PERMISSIONS.SYLLABI_WRITE)
        const course = find('courses', id)
        if (db.syllabi.some((s) => s.courseId === id)) {
          throw new DataError(CODES.CONFLICT, 'Remove this course’s syllabi before deleting it.')
        }
        db.courses = db.courses.filter((c) => c.id !== id)
        return course
      }),
  }

  const syllabi = {
    list: ({ courseId } = {}) =>
      read(() =>
        db.syllabi
          .filter((s) => (courseId ? s.courseId === courseId : true))
          .sort((a, b) => b.year - a.year || a.term.localeCompare(b.term)),
      ),

    create: (input) =>
      write(() => {
        const user = requirePermission(PERMISSIONS.SYLLABI_WRITE)
        const course = find('courses', input.courseId)
        // One file per course per term — the archive lists a course's terms,
        // and two rows for the same one give the reader no way to tell which
        // is current. The database enforces the same with a unique index
        // (migration 0006), so this refuses what the real backend refuses.
        const year = Number(input.year)
        if (
          db.syllabi.some(
            (s) => s.courseId === input.courseId && s.term === input.term && s.year === year,
          )
        ) {
          throw new DataError(
            CODES.CONFLICT,
            `${course.code} already has a ${input.term} ${year} syllabus. Remove it first to replace it.`,
          )
        }
        const row = {
          id: newId(),
          courseId: input.courseId,
          term: input.term,
          year,
          fileName: input.fileName,
          // The real adapter uploads to Storage first and stores the returned
          // object path here. The shape does not change.
          filePath: `syllabi/${input.fileName.toLowerCase().replace(/\s+/g, '-')}`,
          uploadedBy: user.id,
          createdAt: now(),
        }
        db.syllabi.push(row)
        return row
      }),

    remove: (id) =>
      write(() => {
        requirePermission(PERMISSIONS.SYLLABI_WRITE)
        const row = find('syllabi', id)
        db.syllabi = db.syllabi.filter((s) => s.id !== id)
        return row
      }),

    // Supabase returns a Storage URL here; the mock has no bytes, so it
    // returns a same-origin path. Callers use this rather than building a
    // URL themselves, which is what keeps them backend-agnostic.
    publicUrl: (filePath) => `/${filePath}`,
  }

  const subscribers = {
    list: () =>
      read(() => {
        requirePermission(PERMISSIONS.SUBSCRIBERS_READ)
        return [...db.subscribers].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }),

    /** Anonymous insert — the one public write besides form submissions. */
    subscribe: (email, source = 'site') =>
      write(() => {
        const clean = String(email).trim().toLowerCase()
        if (!EMAIL_RE.test(clean)) {
          throw new DataError(CODES.INVALID, 'That does not look like an email address.')
        }
        const existing = db.subscribers.find((s) => s.email === clean)
        if (existing) {
          // Re-subscribing after an unsubscribe should work, but an active
          // subscriber submitting twice is not an error worth showing.
          existing.unsubscribedAt = null
          return existing
        }
        const row = { id: newId(), email: clean, source, createdAt: now(), unsubscribedAt: null }
        db.subscribers.push(row)
        return row
      }),

    remove: (id) =>
      write(() => {
        requirePermission(PERMISSIONS.SUBSCRIBERS_READ)
        const row = find('subscribers', id)
        db.subscribers = db.subscribers.filter((s) => s.id !== id)
        return row
      }),
  }

  const forms = {
    list: ({ audience } = {}) =>
      read(() => db.forms.filter((f) => (audience ? f.audience === audience : true))),

    bySlug: (slug) =>
      read(() => {
        const form = db.forms.find((f) => f.slug === slug)
        if (!form) throw new DataError(CODES.NOT_FOUND, `No form with slug "${slug}".`)
        return form
      }),

    byId: (id) => read(() => find('forms', id)),

    create: (input) =>
      write(() => {
        requirePermission(PERMISSIONS.FORMS_WRITE)
        // Normalised before the check, so create and update judge the same
        // string — and so a missing title fails the check rather than being
        // stringified into one.
        const slug = String(input.slug ?? '').trim()
        const title = String(input.title ?? '').trim()
        checkForm({ ...input, slug, title })
        if (db.forms.some((f) => f.slug === slug)) {
          throw new DataError(CODES.CONFLICT, `A form with the slug "${slug}" already exists.`)
        }
        const form = {
          id: newId(),
          slug,
          title,
          description: input.description ?? '',
          // Internal by default. A form that reaches the public site should
          // have been published on purpose, never by forgetting a field.
          audience: input.audience ?? 'internal',
          isOpen: input.isOpen ?? true,
          fields: input.fields ?? [],
          createdAt: now(),
        }
        db.forms.push(form)
        return form
      }),

    update: (id, patch) =>
      write(() => {
        requirePermission(PERMISSIONS.FORMS_WRITE)
        const form = find('forms', id)
        checkForm(patch)
        if (patch.slug && patch.slug !== form.slug && db.forms.some((f) => f.slug === patch.slug)) {
          throw new DataError(CODES.CONFLICT, `A form with the slug "${patch.slug}" already exists.`)
        }
        Object.assign(form, patch)
        return form
      }),

    remove: (id) =>
      write(() => {
        requirePermission(PERMISSIONS.FORMS_WRITE)
        const form = find('forms', id)
        db.forms = db.forms.filter((f) => f.id !== id)
        db.submissions = db.submissions.filter((s) => s.formId !== id)
        return form
      }),
  }

  const submissions = {
    list: (formId) =>
      read(() => {
        requirePermission(PERMISSIONS.SUBMISSIONS_READ)
        return db.submissions
          .filter((s) => (formId ? s.formId === formId : true))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      }),

    create: (formId, payload) =>
      write(() => {
        const form = find('forms', formId)
        if (!form.isOpen) throw new DataError(CODES.FORBIDDEN, 'This form is closed.')
        // An internal form is never submittable anonymously.
        if (form.audience === 'internal' && !currentUser()) {
          throw new DataError(CODES.NOT_AUTHENTICATED, 'Sign in to submit this form.')
        }
        const missing = missingAnswers(form, payload)
        if (missing.length) {
          throw new DataError(CODES.INVALID, `Please fill in: ${missing.join(', ')}.`)
        }
        const row = {
          id: newId(),
          formId,
          payload: clone(payload),
          submittedBy: currentUser()?.id ?? null,
          createdAt: now(),
        }
        db.submissions.push(row)
        return row
      }),
  }

  /**
   * Refuse a change that would leave nobody able to manage members.
   *
   * `next` is the roster as it would be afterwards. Without this the last
   * president can demote or delete themselves out of the only account that
   * can undo it, and the fix is a service-role key on someone's laptop.
   * The real backend enforces the same floor in the profiles_admin_floor
   * trigger, so it holds whichever path the write arrives by.
   */
  function requireRemainingAdmin(next, roleTable = db.roles) {
    const stillAdmin = next.some((member) =>
      can(roleTable.find((r) => r.id === member.roleId), PERMISSIONS.MEMBERS_WRITE),
    )
    if (!stillAdmin) {
      throw new DataError(
        CODES.CONFLICT,
        'Someone has to keep the ability to manage members. Give another member that role first.',
      )
    }
  }

  const members = {
    list: () =>
      read(() => {
        requirePermission(PERMISSIONS.MEMBERS_WRITE)
        return [...db.members].sort((a, b) => a.fullName.localeCompare(b.fullName))
      }),

    /**
     * Add an account.
     *
     * Supabase does this through an Edge Function, because minting an auth
     * user needs the service-role key and that can never reach a browser.
     * The mock has no auth provider at all: the account it creates signs in
     * with DEV_PASSWORD like every other seeded one, and `password` is
     * validated and then discarded.
     */
    create: (input) =>
      write(() => {
        requirePermission(PERMISSIONS.MEMBERS_WRITE)

        const email = String(input.email ?? '').trim().toLowerCase()
        const fullName = String(input.fullName ?? '').trim()

        if (!EMAIL_RE.test(email)) {
          throw new DataError(CODES.INVALID, 'That does not look like an email address.')
        }
        if (!fullName) {
          throw new DataError(CODES.INVALID, 'Give the new member a name.')
        }
        if (String(input.password ?? '').length < MIN_PASSWORD_LENGTH) {
          throw new DataError(
            CODES.INVALID,
            `The temporary password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
          )
        }
        find('roles', input.roleId)
        if (db.members.some((m) => m.email.toLowerCase() === email)) {
          throw new DataError(CODES.CONFLICT, `${email} already has an account.`)
        }

        const member = {
          id: newId(),
          email,
          fullName,
          roleId: input.roleId,
          createdAt: now(),
        }
        db.members.push(member)
        return member
      }),

    update: (id, patch) =>
      write(() => {
        const actor = requirePermission(PERMISSIONS.MEMBERS_WRITE)
        const member = find('members', id)

        if (patch.roleId && patch.roleId !== member.roleId) {
          find('roles', patch.roleId)
          // Demoting yourself locks you out of this page, and there may be no
          // other president left to undo it.
          if (member.id === actor.id) {
            throw new DataError(CODES.FORBIDDEN, 'You cannot change your own role.')
          }
          requireRemainingAdmin(
            db.members.map((m) => (m.id === id ? { ...m, roleId: patch.roleId } : m)),
          )
        }

        Object.assign(member, patch)
        return member
      }),

    /**
     * Delete an account outright — on Supabase this removes the auth user, so
     * the address is free to be invited again.
     *
     * Authorship is nulled rather than cascaded, matching `on delete set
     * null` on posts, syllabi and submissions: someone leaving the board must
     * not take the blog and the archive with them.
     */
    remove: (id) =>
      write(() => {
        const actor = requirePermission(PERMISSIONS.MEMBERS_WRITE)
        const member = find('members', id)

        if (member.id === actor.id) {
          throw new DataError(CODES.FORBIDDEN, 'You cannot remove your own account.')
        }
        requireRemainingAdmin(db.members.filter((m) => m.id !== id))

        db.members = db.members.filter((m) => m.id !== id)
        db.posts.forEach((p) => {
          if (p.authorId === id) p.authorId = null
        })
        db.syllabi.forEach((s) => {
          if (s.uploadedBy === id) s.uploadedBy = null
        })
        db.submissions.forEach((s) => {
          if (s.submittedBy === id) s.submittedBy = null
        })
        return member
      }),
  }

  const roles = {
    list: () => read(() => db.roles),

    update: (id, patch) =>
      write(() => {
        requirePermission(PERMISSIONS.MEMBERS_WRITE)
        const role = find('roles', id)
        // Same floor as demoting a person: stripping members:write from the
        // last role that carries it locks everyone out of this page.
        if (patch.permissions) {
          requireRemainingAdmin(
            db.members,
            db.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
          )
        }
        Object.assign(role, patch)
        return role
      }),
  }

  return {
    name: 'mock',
    auth,
    posts,
    courses,
    syllabi,
    subscribers,
    forms,
    submissions,
    members,
    roles,
    /** Test and dev-tooling escape hatch. Not part of the adapter interface. */
    __reset() {
      db = seed ? clone(seed) : createSeed()
      session = null
      persist()
      emit()
    },
  }
}
