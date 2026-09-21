import { createSeed } from './seed.js'
import { can, PERMISSIONS } from './permissions.js'
import { DataError, CODES } from './errors.js'

const STORAGE_KEY = 'mads.mock.db'

/** Password for every seeded account while there is no real auth provider. */
export const DEV_PASSWORD = 'mads'

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
        if (db.courses.some((c) => c.code.toLowerCase() === input.code.toLowerCase())) {
          throw new DataError(CODES.CONFLICT, `${input.code} is already in the catalogue.`)
        }
        const course = { id: newId(), code: input.code, title: input.title, level: input.level ?? '' }
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
        find('courses', input.courseId)
        const row = {
          id: newId(),
          courseId: input.courseId,
          term: input.term,
          year: Number(input.year),
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
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
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
        if (db.forms.some((f) => f.slug === input.slug)) {
          throw new DataError(CODES.CONFLICT, `A form with the slug "${input.slug}" already exists.`)
        }
        const form = {
          id: newId(),
          slug: input.slug,
          title: input.title,
          description: input.description ?? '',
          audience: input.audience ?? 'internal',
          isOpen: true,
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
        const missing = form.fields
          .filter((f) => f.required && !String(payload[f.name] ?? '').trim())
          .map((f) => f.label)
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

  const members = {
    list: () =>
      read(() => {
        requirePermission(PERMISSIONS.MEMBERS_WRITE)
        return [...db.members].sort((a, b) => a.fullName.localeCompare(b.fullName))
      }),

    update: (id, patch) =>
      write(() => {
        requirePermission(PERMISSIONS.MEMBERS_WRITE)
        const member = find('members', id)
        if (patch.roleId) find('roles', patch.roleId)
        Object.assign(member, patch)
        return member
      }),
  }

  const roles = {
    list: () => read(() => db.roles),

    update: (id, patch) =>
      write(() => {
        requirePermission(PERMISSIONS.MEMBERS_WRITE)
        const role = find('roles', id)
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
