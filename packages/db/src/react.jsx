import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { can } from './permissions.js'

const DataContext = createContext(null)

/**
 * Holds the client and the current session. Session lives here rather than in
 * each consumer so a sign-out re-renders every gated view at once.
 */
export function DataProvider({ client, children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    client.auth.getSession().then((current) => {
      if (alive) {
        setSession(current)
        setLoading(false)
      }
    })

    const unsubscribe = client.auth.onChange((next) => {
      if (alive) setSession(next)
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [client])

  return (
    <DataContext.Provider value={{ client, session, loading }}>{children}</DataContext.Provider>
  )
}

function useDataContext() {
  const context = useContext(DataContext)
  if (!context) throw new Error('Wrap this tree in <DataProvider client={...}>.')
  return context
}

/** The raw client, for mutations and one-off calls. */
export function useData() {
  return useDataContext().client
}

/** `{ session, loading, signIn, signOut }` — session is null when signed out. */
export function useSession() {
  const { client, session, loading } = useDataContext()
  return {
    session,
    loading,
    user: session?.user ?? null,
    role: session?.role ?? null,
    signIn: useCallback((credentials) => client.auth.signIn(credentials), [client]),
    signOut: useCallback(() => client.auth.signOut(), [client]),
  }
}

/** True when the signed-in role grants every listed permission. */
export function useCan(...permissions) {
  const { session } = useDataContext()
  return can(session?.role, ...permissions)
}

/**
 * Read data with loading and error state.
 *
 * `factory` is called with the client. `deps` behaves like a useEffect dep
 * array — list anything the factory closes over.
 *
 *   const { data: posts, loading } = useQuery((c) => c.posts.list({ status: 'published' }))
 */
export function useQuery(factory, deps = []) {
  const { client, session } = useDataContext()
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState((previous) => ({ ...previous, loading: true }))

    Promise.resolve()
      .then(() => factory(client))
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))

    return () => {
      alive = false
    }
    // `session` is a dependency because permission-gated reads must re-run
    // when the signed-in user changes, not serve the previous user's rows.
  }, [client, session, nonce, ...deps]) // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refetch: useCallback(() => setNonce((n) => n + 1), []) }
}

/**
 * Run a mutation with pending and error state, without each form
 * reimplementing the same try/catch/finally.
 *
 *   const save = useAction((c, input) => c.posts.create(input))
 *   const result = await save.run({ ... })
 *   if (!result.ok) return          // `save.error` is already rendering
 *   navigate(`/posts/${result.data.id}`)
 *
 * `run` resolves to `{ ok: true, data }` or `{ ok: false, error }` and never
 * rejects. Rejecting would be the more obvious design, but every caller here
 * is an event handler, where an uncaught rejection is invisible in the UI and
 * surfaces only as an unhandled-rejection warning. Returning the outcome
 * makes failure something the caller has to step over rather than something
 * it can forget to catch.
 */
export function useAction(factory) {
  const { client } = useDataContext()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  // Callers pass an inline arrow, so keep the latest one in a ref and let
  // `run` stay referentially stable — otherwise it churns on every render.
  // Assigned in a layout effect rather than during render: `run` is only
  // ever called from an event handler, which is long after this has settled.
  const latest = useRef(factory)
  useLayoutEffect(() => {
    latest.current = factory
  })

  const run = useCallback(
    async (...args) => {
      setPending(true)
      setError(null)
      try {
        return { ok: true, data: await latest.current(client, ...args) }
      } catch (caught) {
        setError(caught)
        return { ok: false, error: caught }
      } finally {
        setPending(false)
      }
    },
    [client],
  )

  return { run, pending, error, reset: useCallback(() => setError(null), []) }
}
