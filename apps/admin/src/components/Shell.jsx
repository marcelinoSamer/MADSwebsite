import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useSession } from '@mads/db/react'
import { PERMISSIONS, can } from '@mads/db'

// Each destination declares what it needs. The sidebar shows only what this
// role can actually open, so nobody navigates into a dead end.
const NAV = [
  { to: '/', label: 'Overview', end: true, need: [] },
  { to: '/posts', label: 'Posts', need: [PERMISSIONS.POSTS_READ] },
  { to: '/syllabi', label: 'Syllabi', need: [PERMISSIONS.SYLLABI_WRITE] },
  // No permission: everyone signed in fills forms in, whatever else their
  // role allows. The list itself decides which actions each role is offered.
  { to: '/forms', label: 'Forms', need: [] },
  { to: '/subscribers', label: 'Subscribers', need: [PERMISSIONS.SUBSCRIBERS_READ] },
  { to: '/members', label: 'Members', need: [PERMISSIONS.MEMBERS_WRITE] },
]

function Shell() {
  const { user, role, signOut } = useSession()
  const navigate = useNavigate()
  const [navOpen, setNavOpen] = useState(false)

  const visible = NAV.filter((item) => can(role, ...item.need))

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <header className="shell-bar">
        <div className="shell-brand">
          <img src="/Logos/logo2.svg" alt="" />
          <span>
            MADS <span className="shell-brand-sub">Admin</span>
          </span>
        </div>

        <button
          type="button"
          className="shell-nav-toggle"
          aria-expanded={navOpen}
          aria-controls="shell-nav"
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? 'Close' : 'Menu'}
        </button>

        <div className="shell-user">
          <span className="shell-user-name">{user?.fullName}</span>
          <span className="micro shell-user-role">{role?.name}</span>
          <button type="button" className="btn btn-quiet" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="shell-body">
        <nav id="shell-nav" className="shell-nav" data-open={navOpen}>
          <ul>
            {visible.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="shell-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Shell
