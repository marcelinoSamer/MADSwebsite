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

/**
 * The field types the renderers know how to draw, in the order the editor
 * offers them. `checkbox` is the one multi-answer type: its answer is stored
 * as an array of the chosen options, every other type stores one string.
 */
export const FIELD_TYPES = [
  'text',
  'textarea',
  'radio',
  'checkbox',
  'select',
  'scale',
  'email',
  'number',
  'date',
  'time',
]

/** Types whose answer is picked from `options`. */
export const CHOICE_TYPES = ['radio', 'checkbox', 'select']

/**
 * A linear scale runs from `scaleMin` to `scaleMax`, Google Forms' own
 * bounds: it starts at 0 or 1 and ends somewhere from 2 to 10.
 */
export const SCALE_LIMITS = { min: [0, 1], max: [2, 10], defaultMin: 1, defaultMax: 5 }

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
    if (field.type !== undefined && !FIELD_TYPES.includes(field.type)) {
      throw new DataError(CODES.INVALID, `The question “${name}” has an unknown type.`)
    }
    if (CHOICE_TYPES.includes(field.type)) {
      const options = field.options ?? []
      if (!options.length) {
        throw new DataError(CODES.INVALID, `The question “${name}” is a choice with no options.`)
      }
      if (new Set(options).size !== options.length) {
        throw new DataError(CODES.INVALID, `The question “${name}” lists the same option twice.`)
      }
    }
    if (field.type === 'scale') {
      const min = Number(field.scaleMin ?? SCALE_LIMITS.defaultMin)
      const max = Number(field.scaleMax ?? SCALE_LIMITS.defaultMax)
      if (!SCALE_LIMITS.min.includes(min) || max < SCALE_LIMITS.max[0] || max > SCALE_LIMITS.max[1]) {
        throw new DataError(
          CODES.INVALID,
          `The scale on “${name}” has to start at 0 or 1 and end between 2 and 10.`,
        )
      }
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
    .filter((field) => field.required && isBlank(payload[field.name]))
    .map((field) => field.label)
}

/** A checkbox answer is an array; nothing ticked is as blank as an empty string. */
export function isBlank(answer) {
  if (Array.isArray(answer)) return answer.length === 0
  return !String(answer ?? '').trim()
}

/** An answer as one line of text, for a table cell or a CSV column. */
export function answerText(answer) {
  if (Array.isArray(answer)) return answer.join(', ')
  return String(answer ?? '')
}
