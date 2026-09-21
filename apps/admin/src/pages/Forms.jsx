import { Link } from 'react-router'
import { useQuery, useAction, useCan } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'

function FormList() {
  const { data: forms, loading, error, refetch } = useQuery((c) => c.forms.list())
  const canReadSubmissions = useCan(PERMISSIONS.SUBMISSIONS_READ)
  const setOpen = useAction((client, id, isOpen) => client.forms.update(id, { isOpen }))

  async function toggle(form) {
    if ((await setOpen.run(form.id, !form.isOpen)).ok) refetch()
  }

  return (
    <>
      <PageTitle
        title="Forms"
        lead="Public forms appear on the site at /forms/<slug>. Internal ones are filled in from here."
      />

      {setOpen.error && <p className="state state-error" role="alert">{setOpen.error.message}</p>}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={forms?.length === 0}
        empty="No forms defined yet."
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Form</th>
                <th scope="col">Audience</th>
                <th scope="col">Fields</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {forms?.map((form) => (
                <tr key={form.id}>
                  <th scope="row">
                    {form.title}
                    <span className="micro row-sub">/{form.slug}</span>
                  </th>
                  <td className="cell-muted">{form.audience}</td>
                  <td className="cell-muted">{form.fields.length}</td>
                  <td>
                    <span className={`badge badge-${form.isOpen ? 'published' : 'draft'}`}>
                      {form.isOpen ? 'open' : 'closed'}
                    </span>
                  </td>
                  <td className="cell-actions">
                    {canReadSubmissions && (
                      <Link className="btn btn-quiet" to={`/forms/${form.id}/submissions`}>
                        Responses
                      </Link>
                    )}
                    <button type="button" className="btn btn-quiet" onClick={() => toggle(form)}>
                      {form.isOpen ? 'Close' : 'Reopen'}
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

function Forms() {
  return (
    <Gate need={[PERMISSIONS.FORMS_WRITE]}>
      <FormList />
    </Gate>
  )
}

export default Forms
