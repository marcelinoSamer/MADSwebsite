import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import SectionLink from './SectionLink'

const SECTIONS = [
  { hash: '#about', label: 'About' },
  { hash: '#calendar', label: 'Calendar' },
]

const PAGES = [
  { to: '/blog', label: 'Blog' },
  { to: '/syllabi', label: 'Syllabi' },
]

function NavLinks({ onNavigate }) {
  return (
    <>
      {SECTIONS.map(({ hash, label }) => (
        <li key={hash}>
          <SectionLink hash={hash} onClick={onNavigate}>{label}</SectionLink>
        </li>
      ))}
      {PAGES.map(({ to, label }) => (
        <li key={to}>
          <Link to={to} onClick={onNavigate}>{label}</Link>
        </li>
      ))}
    </>
  )
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  // The panel covers the page, so closing it is part of following a link —
  // handled on the click rather than by watching the pathname, since a
  // same-page hash link does not change the pathname at all.
  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event) => event.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link className="nav-brand" to="/">
          <img src="/Logos/logo2.svg" alt="MADS logo" />
          <span className="nav-wordmark">
            <span className="letter-m">M</span>
            <span className="letter-a">A</span>
            <span className="letter-d">D</span>
            <span className="letter-s">S</span>
          </span>
        </Link>

        <ul className="nav-links">
          <NavLinks />
        </ul>

        <SectionLink hash="#join" className="btn btn-solid nav-cta">
          Join MADS
        </SectionLink>

        {/* Before the router there was nothing below 880px to reach, so there
            was no menu. Now /blog and /syllabi exist and would be
            unreachable on a phone without one. */}
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Kept mounted so `aria-controls` always points at a real element. */}
      <div id="nav-menu" className="nav-menu" hidden={!menuOpen}>
        <ul className="container">
          <NavLinks onNavigate={closeMenu} />
          <li>
            <SectionLink hash="#join" onClick={closeMenu}>Join MADS</SectionLink>
          </li>
        </ul>
      </div>
    </header>
  )
}

export default Navbar
