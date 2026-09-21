import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from '@mads/db/react'

/**
 * Layout route that admits only a signed-in user.
 *
 * The session is restored asynchronously, so a redirect before it resolves
 * would bounce someone who is in fact signed in — hence the explicit
 * loading branch rather than treating "no session yet" as "signed out".
 */
function RequireAuth() {
  const { session, loading } = useSession()
  const location = useLocation()

  if (loading) {
    return (
      <div className="boot" role="status">
        Checking your session…
      </div>
    )
  }

  if (!session) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default RequireAuth
