const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "12 September 2026" — the brand voice asks for dates spelled out, not 12/09/26. */
export function formatDate(iso) {
  return iso ? DATE.format(new Date(iso)) : ''
}

/**
 * "4 min read", from the markdown body.
 *
 * 200 words a minute, rounded up, floored at one — a post is never "0 min".
 * Markdown syntax is counted as words, which overstates a heavily formatted
 * post by a few seconds and is not worth stripping for.
 */
export function readingTime(markdown) {
  const words = String(markdown ?? '').trim().split(/\s+/).filter(Boolean).length
  if (!words) return ''
  return `${Math.max(1, Math.round(words / 200))} min read`
}

// Calendar dates carry no zone (see packages/db/src/eventRules.js), so they
// are printed as UTC to stop a browser in another zone moving them a day.
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const DAY_ONLY = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: 'UTC' })
const asDate = (iso) => new Date(`${iso}T00:00:00Z`)

/** "Sep 28", "Nov 7–8", "Nov 30 – Dec 1" — short enough for the date column. */
export function eventDateLabel({ date, endDate }) {
  if (!endDate || endDate === date) return SHORT.format(asDate(date))
  if (endDate.slice(0, 7) === date.slice(0, 7)) {
    return `${SHORT.format(asDate(date))}–${DAY_ONLY.format(asDate(endDate))}`
  }
  return `${SHORT.format(asDate(date))} – ${SHORT.format(asDate(endDate))}`
}

/** "17:00–19:00 · Hatem Hall seminar room", or "" for an all-day event with no venue. */
export function eventWhere({ startTime, endTime, location }) {
  const time = startTime ? (endTime ? `${startTime}–${endTime}` : startTime) : ''
  return [time, location].filter(Boolean).join(' · ')
}

/** "Fall 2026" from a YYYY-MM-DD: Spring to May, Summer to August, Fall after. */
export function semesterOf(iso) {
  const month = Number(iso.slice(5, 7))
  const term = month <= 5 ? 'Spring' : month <= 8 ? 'Summer' : 'Fall'
  return `${term} ${iso.slice(0, 4)}`
}
