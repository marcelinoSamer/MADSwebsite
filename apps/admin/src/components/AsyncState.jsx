/** The loading / error / empty triple, as on the public site. */
function AsyncState({ loading, error, isEmpty = false, empty = 'Nothing here yet.', children }) {
  if (loading) {
    return <p className="state" role="status">Loading…</p>
  }

  if (error) {
    return (
      <p className="state state-error" role="alert">
        {error.message || 'Something went wrong loading this.'}
      </p>
    )
  }

  if (isEmpty) {
    return <p className="state state-empty">{empty}</p>
  }

  return children
}

export default AsyncState
