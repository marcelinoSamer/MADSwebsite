import { useCan } from '@mads/db/react'

/**
 * Hides a view from a role that may not use it.
 *
 * This is a courtesy, not a security boundary — it stops someone being shown
 * a page whose every action will fail. The adapter refuses the writes
 * regardless, and RLS will refuse them at the database once that exists.
 * Never let this be the only thing standing between a role and an action.
 */
function Gate({ need = [], children }) {
  const permitted = useCan(...need)

  if (!permitted) {
    return (
      <div className="panel panel-quiet">
        <h2>Not your area</h2>
        <p>
          Your role does not include this. If you think it should, ask the president to
          adjust it under Members.
        </p>
      </div>
    )
  }

  return children
}

export default Gate
