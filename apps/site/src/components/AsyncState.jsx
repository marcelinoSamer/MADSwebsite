/**
 * The loading / error / empty triple, in one place.
 *
 * Every data-backed page needs all three and they are the states most likely
 * to ship broken, so they are written once rather than improvised per page.
 * Returns `children` only when there is something real to show.
 */
function AsyncState({ loading, error, isEmpty = false, empty = 'Nothing here yet.', children }) {
  if (loading) {
    return (
      <p className="state state-loading" role="status">
        Loading…
      </p>
    )
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
