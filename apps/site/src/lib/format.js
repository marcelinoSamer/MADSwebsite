const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "12 September 2026" — the brand voice asks for dates spelled out, not 12/09/26. */
export function formatDate(iso) {
  return iso ? DATE.format(new Date(iso)) : ''
}
