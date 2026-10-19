import { DataError, CODES } from './errors.js'

/**
 * Rules for a calendar event, shared by both adapters — the same reasoning as
 * formRules.js. None of this is a permission check; it is what Postgres would
 * either reject opaquely (the check constraints in 0008) or accept and render
 * as nonsense (an event with no title, or one that ends before it starts).
 *
 * Dates are YYYY-MM-DD and times HH:MM, wall-clock Cairo time with no zone.
 * A null `startTime` is an all-day event; a null `endDate` is a single day.
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const blank = (value) => value == null || value === ''

export function checkEvent(patch, current = {}) {
  const next = { ...current, ...patch }

  if (patch.title !== undefined && !String(patch.title).trim()) {
    throw new DataError(CODES.INVALID, 'Give the event a title.')
  }
  if (patch.date !== undefined && !DATE_RE.test(String(patch.date))) {
    throw new DataError(CODES.INVALID, 'Give the event a date.')
  }
  if (!blank(patch.endDate) && !DATE_RE.test(String(patch.endDate))) {
    throw new DataError(CODES.INVALID, 'That end date is not a date.')
  }
  for (const key of ['startTime', 'endTime']) {
    if (!blank(patch[key]) && !TIME_RE.test(String(patch[key]))) {
      throw new DataError(CODES.INVALID, 'Times are written as HH:MM.')
    }
  }
  if (blank(next.startTime) && !blank(next.endTime)) {
    throw new DataError(CODES.INVALID, 'An end time needs a start time.')
  }

  // ISO dates and zero-padded times both sort as plain strings.
  if (!blank(next.endDate) && next.endDate < next.date) {
    throw new DataError(CODES.INVALID, 'The event cannot end before it starts.')
  }
  const sameDay = blank(next.endDate) || next.endDate === next.date
  if (sameDay && !blank(next.endTime) && next.endTime < next.startTime) {
    throw new DataError(CODES.INVALID, 'The event cannot end before it starts.')
  }
}

/** Blank strings become null, so "no end date" is stored one way only. */
export function normaliseEvent(input) {
  const out = { ...input }
  for (const key of ['endDate', 'startTime', 'endTime']) {
    if (key in out && blank(out[key])) out[key] = null
  }
  if ('title' in out) out.title = String(out.title).trim()
  return out
}

/** Order events by day, all-day entries first, then by start time. */
export function compareEvents(a, b) {
  return (
    a.date.localeCompare(b.date) ||
    (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
    a.title.localeCompare(b.title)
  )
}

// Formatting lives beside the rules because it is the other half of the same
// contract: dates carry no zone, so they are parsed and printed as UTC to keep
// a browser in any zone from moving them a day.
const DAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const YEAR = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' })
const asDate = (iso) => new Date(`${iso}T00:00:00Z`)

/** "Sat 7 Nov – Sun 8 Nov 2026 · All day", "Mon 28 Sep 2026 · 17:00–19:00". */
export function formatEventWhen(event) {
  const start = asDate(event.date)
  const multiDay = event.endDate && event.endDate !== event.date
  const days = multiDay
    ? `${DAY.format(start)} – ${DAY.format(asDate(event.endDate))} ${YEAR.format(asDate(event.endDate))}`
    : `${DAY.format(start)} ${YEAR.format(start)}`
  const time = event.startTime
    ? event.endTime
      ? `${event.startTime}–${event.endTime}`
      : event.startTime
    : 'All day'
  return `${days} · ${time}`
}

/** Today in Cairo as YYYY-MM-DD — the calendar's own zone, whatever the browser's. */
export function todayIso(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now)
}
