import { Link } from 'react-router'
import NormalCurve from './NormalCurve'
import NewsletterSignup from './NewsletterSignup'

// The hero is the site's directory, not a pitch: the things a visitor
// actually came for, reachable without scrolling. Anything that only
// describes the association lives further down the page.
const ENTRIES = [
  { to: '/blog', label: 'Blog', note: 'Recaps, results, announcements' },
  { to: '/syllabi', label: 'Syllabi', note: 'Course outlines, by semester' },
]

function Hero() {
  return (
    <section className="hero">
      <img
        className="hero-watermark"
        src="/Logos/logo_transparent.svg"
        alt=""
        aria-hidden="true"
      />
      <span className="hero-circle hero-circle-a" aria-hidden="true" />
      <span className="hero-circle hero-circle-b" aria-hidden="true" />

      <div className="container hero-inner">
        <p className="hero-eyebrow rise rise-1">
          MADS · The American University in Cairo
        </p>
        <h1 className="hero-title rise rise-2">
          Mathematics, Actuarial &amp; Data Science Association
        </h1>

        <nav className="hero-entries rise rise-3" aria-label="What's here">
          {ENTRIES.map(({ to, label, note }) => (
            <Link key={to} className="hero-entry" to={to}>
              <span className="hero-entry-label">{label}</span>
              <span className="hero-entry-note">{note}</span>
            </Link>
          ))}
        </nav>

        {/* The same form as the membership band below, mounted here so the
            one thing we ask of a visitor takes no scrolling. */}
        <div className="hero-newsletter rise rise-4">
          <NewsletterSignup label="Events and deadlines, by email" />
        </div>
      </div>

      <NormalCurve />
    </section>
  )
}

export default Hero
