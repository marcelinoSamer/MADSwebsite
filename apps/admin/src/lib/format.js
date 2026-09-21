const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const DATETIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso) {
  return iso ? DATE.format(new Date(iso)) : ''
}

export function formatDateTime(iso) {
  return iso ? DATETIME.format(new Date(iso)) : ''
}

/** Turn a title into a URL slug. Used to prefill, never to overwrite. */
export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
