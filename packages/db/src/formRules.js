import { DataError, CODES } from './errors.js'

/**
 * Rules for a form definition, shared by both adapters.
 *
 * Permission checks belong in the mock alone — the database enforces those
 * itself. These are different: `audience` carries a check constraint that
 * would come back as an opaque Postgres error, and nothing in the schema can
 * see that two fields share a name. So both adapters run these before writing
 * and the admin panel gets the same message either side of the cutover.
 */

/**
 * A form's `audience` is the public flag: `public` forms are rendered on the
 * site at `/forms/<slug>`, `internal` ones exist only inside the admin panel
 * and are filled in from there.
 */
export const AUDIENCES = ['public', 'internal']

export const AUDIENCE_LABELS = {
  public: 'Public — anyone on the site',
  internal: 'Internal — committee only, filled in here',
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The field types the renderers know how to draw. */
export const FIELD_TYPES = ['text', 'textarea', 'email', 'number', 'date', 'select']

/** Validates a create input or an update patch. Ignores keys not present. */
export function checkForm(patch) {
  if (patch.slug !== undefined && !SLUG_RE.test(patch.slug)) {
    throw new DataError(
      CODES.INVALID,
      'A slug is lowercase letters, numbers and hyphens — it becomes part of the URL.',
    )
  }
  if (patch.title !== undefined && !String(patch.title).trim()) {
    throw new DataError(CODES.INVALID, 'Give the form a title.')
  }
  if (patch.audience !== undefined && !AUDIENCES.includes(patch.audience)) {
    throw new DataError(CODES.INVALID, `Audience must be one of: ${AUDIENCES.join(', ')}.`)
  }
  if (patch.fields !== undefined) checkFields(patch.fields)
}

export function checkFields(fields) {
  if (!Array.isArray(fields)) throw new DataError(CODES.INVALID, 'Questions must be a list.')

  const names = new Set()
  for (const field of fields) {
    const name = String(field.name ?? '').trim()
    if (!name) throw new DataError(CODES.INVALID, 'Every question needs a name.')
    if (!String(field.label ?? '').trim()) {
      throw new DataError(CODES.INVALID, `The question “${name}” needs a label.`)
    }
    // An answer is stored under its field name, so two fields sharing a name
    // means the second silently overwrites the first one's answer.
    if (names.has(name)) {
      throw new DataError(CODES.CONFLICT, `Two questions share the name “${name}”.`)
    }
    if (field.type === 'select' && !(field.options ?? []).length) {
      throw new DataError(CODES.INVALID, `The question “${name}” is a choice with no options.`)
    }
    names.add(name)
  }
}

/**
 * Answers missing from a submission, by label.
 *
 * Shared so the mock and Supabase refuse the same submission — RLS decides
 * *whether* you may submit, it does not police what you wrote.
 */
export function missingAnswers(form, payload) {
  return (form.fields ?? [])
    .filter((field) => field.required && !String(payload[field.name] ?? '').trim())
    .map((field) => field.label)
}
