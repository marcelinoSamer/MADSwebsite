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
