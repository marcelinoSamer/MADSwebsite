import { Link, useParams } from 'react-router'
import { useQuery } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { formatDateTime } from '../lib/format'

function Responses() {
  const { id } = useParams()
  const form = useQuery((c) => c.forms.byId(id), [id])
  const submissions = useQuery((c) => c.submissions.list(id), [id])

  // Columns come from the form definition, not from the first row — a field
  // added later would otherwise silently disappear from the table.
  const fields = form.data?.fields ?? []

  return (
    <>
      <PageTitle
        title={form.data ? form.data.title : 'Responses'}
        lead={`${submissions.data?.length ?? 0} response${submissions.data?.length === 1 ? '' : 's'}.`}
      >
        <Link className="btn btn-quiet" to="/forms">Back to forms</Link>
      </PageTitle>

      <AsyncState
        loading={form.loading || submissions.loading}
        error={form.error || submissions.error}
        isEmpty={submissions.data?.length === 0}
        empty="Nobody has filled this in yet."
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">When</th>
                {fields.map((field) => (
                  <th key={field.id} scope="col">{field.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.data?.map((submission) => (
                <tr key={submission.id}>
                  <th scope="row" className="cell-muted cell-nowrap">
                    {formatDateTime(submission.createdAt)}
                  </th>
                  {fields.map((field) => (
                    <td key={field.id} className="cell-long">
                      {String(submission.payload[field.name] ?? '') || <span className="cell-muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </>
  )
}

function Submissions() {
  return (
    <Gate need={[PERMISSIONS.SUBMISSIONS_READ]}>
      <Responses />
    </Gate>
  )
}

export default Submissions
