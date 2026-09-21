import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useSession, useAction, useData } from '@mads/db/react'

function Login() {
  const { session, loading } = useSession()
  const client = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useAction((client, credentials) => client.auth.signIn(credentials))

  // Already signed in — send them on rather than showing a form they do not
  // need. `replace` keeps Back from landing here again.
  if (!loading && session) {
    return <Navigate to={location.state?.from ?? '/'} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    // `signIn.error` renders below when this fails.
    if ((await signIn.run({ email, password })).ok) {
      navigate(location.state?.from ?? '/', { replace: true })
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-brand">
          <img src="/Logos/logo2.svg" alt="" />
          <span>
            MADS <span className="shell-brand-sub">Admin</span>
          </span>
        </div>

        <h1>Sign in</h1>
        <p className="page-lead">For committee members. Everything here is logged to your account.</p>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {signIn.error && (
          <p className="state state-error" role="alert">{signIn.error.message}</p>
        )}

        <button type="submit" className="btn btn-solid" disabled={signIn.pending}>
          {signIn.pending ? 'Signing in…' : 'Sign in'}
        </button>

        {/* Only when running without a Supabase project, where the seeded
            mock accounts share one throwaway password. Against the real
            backend there is nothing to hint at. */}
        {client.name === 'mock' && (
          <p className="login-hint micro">
            No Supabase project configured — running on mock data. Sign in as{' '}
            <code>mads@aucegypt.edu</code> with password <code>mads</code>.
          </p>
        )}
      </form>
    </div>
  )
}

export default Login
