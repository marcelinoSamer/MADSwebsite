import { useQuery, useAction } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { formatDate } from '../lib/format'

/**
 * Until there is a provider that can send mail, exporting is how a newsletter
 * actually goes out — paste the list into whatever tool the board already
 * uses. Built here rather than left as a manual database query.
 */
function exportCsv(subscribers) {
  const rows = [
    ['email', 'source', 'subscribed', 'unsubscribed'],
    ...subscribers.map((s) => [s.email, s.source, s.createdAt, s.unsubscribedAt ?? '']),
  ]
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `mads-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function List() {
  const { data: subscribers, loading, error, refetch } = useQuery((c) => c.subscribers.list())
  const remove = useAction((client, id) => client.subscribers.remove(id))

  const active = subscribers?.filter((s) => !s.unsubscribedAt) ?? []

  async function handleRemove(id) {
    if ((await remove.run(id)).ok) refetch()
  }

  return (
    <>
      <PageTitle
        title="Subscribers"
        lead={`${active.length} active. Sign-ups are stored here; sending still happens elsewhere.`}
      >
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => exportCsv(subscribers ?? [])}
          disabled={!subscribers?.length}
        >
          Export CSV
        </button>
      </PageTitle>

      {remove.error && <p className="state state-error" role="alert">{remove.error.message}</p>}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={subscribers?.length === 0}
        empty="Nobody has signed up yet."
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Source</th>
                <th scope="col">Signed up</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {subscribers?.map((subscriber) => (
                <tr key={subscriber.id}>
                  <th scope="row">{subscriber.email}</th>
                  <td className="cell-muted">{subscriber.source}</td>
                  <td className="cell-muted">{formatDate(subscriber.createdAt)}</td>
                  <td>
                    <span className={`badge badge-${subscriber.unsubscribedAt ? 'draft' : 'published'}`}>
                      {subscriber.unsubscribedAt ? 'unsubscribed' : 'active'}
                    </span>
                  </td>
                  <td className="cell-actions">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleRemove(subscriber.id)}
                      aria-label={`Remove ${subscriber.email}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </>
  )
}

function Subscribers() {
  return (
    <Gate need={[PERMISSIONS.SUBSCRIBERS_READ]}>
      <List />
    </Gate>
  )
}

export default Subscribers
