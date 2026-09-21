import { useState } from 'react'
import { useAction } from '@mads/db/react'

/**
 * The one anonymous write on the landing page.
 *
 * Note the honeypot: an anonymous INSERT is reachable by anything that can
 * reach the site, and a bot filling every field is the cheapest attack there
 * is. A field no human can see catches the unsophisticated ones. If real
 * spam arrives, the answer is a CAPTCHA verified server-side, which is the
 * first thing here that will need an Edge Function.
 */
function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [trap, setTrap] = useState('')
  const [done, setDone] = useState(false)
  const subscribe = useAction((client, address) => client.subscribers.subscribe(address, 'site'))

  async function handleSubmit(event) {
    event.preventDefault()

    // Silently accept — a bot should not learn that it was caught.
    if (trap) {
      setDone(true)
      return
    }

    // `subscribe.error` renders below when this fails.
    if ((await subscribe.run(email)).ok) setDone(true)
  }

  if (done) {
    return (
      <p className="newsletter-done" role="status">
        You’re on the list. We only send things worth reading.
      </p>
    )
  }

  return (
    <form className="newsletter" onSubmit={handleSubmit} noValidate>
      <label className="micro" htmlFor="newsletter-email">
        Get the newsletter
      </label>

      <div className="newsletter-row">
        <input
          id="newsletter-email"
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@aucegypt.edu"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <button type="submit" className="btn btn-solid" disabled={subscribe.pending}>
          {subscribe.pending ? 'Adding…' : 'Sign up'}
        </button>
      </div>

      <div className="honeypot" aria-hidden="true">
        <label htmlFor="newsletter-website">Leave this field empty</label>
        <input
          id="newsletter-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={(event) => setTrap(event.target.value)}
        />
      </div>

      {subscribe.error && (
        <p className="state state-error" role="alert">{subscribe.error.message}</p>
      )}
    </form>
  )
}

export default NewsletterSignup
