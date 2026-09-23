import { Link } from 'react-router'
import { useQuery, useAction, useCan } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'

/**
 * The forms index.
 *
 * Not behind a <Gate>. Everyone signed in needs to reach this to fill an
 * internal form in — that is the whole point of one. What a role can do to a
 * form varies below: `forms:write` edits the questions and opens or closes
 * it, `submissions:read` reads the answers, and anyone may answer.
 */
function Forms() {
  const canEdit = useCan(PERMISSIONS.FORMS_WRITE)
  const canReadSubmissions = useCan(PERMISSIONS.SUBMISSIONS_READ)
  const { data: forms, loading, error, refetch } = useQuery((c) => c.forms.list())
  const setOpen = useAction((client, id, isOpen) => client.forms.update(id, { isOpen }))

  // A closed form is not fillable and not editable by this role, so it is
  // only noise on the list — same reasoning as Shell hiding dead-end nav.
  const visible = canEdit ? forms : forms?.filter((form) => form.isOpen)

  async function toggle(form) {
    if ((await setOpen.run(form.id, !form.isOpen)).ok) refetch()
  }

  return (
    <>
      <PageTitle
        title="Forms"
        lead={
          canEdit
            ? 'Public forms appear on the site at /forms/<slug>. Internal ones live here only. Anyone signed in can fill either one in.'
            : 'Forms you can fill in. Internal ones are for the committee and never appear on the site.'
        }
      >
        {canEdit && <Link className="btn btn-solid" to="/forms/new">New form</Link>}
      </PageTitle>

      {setOpen.error && <p className="state state-error" role="alert">{setOpen.error.message}</p>}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={visible?.length === 0}
        empty={canEdit ? 'No forms defined yet.' : 'No forms are open at the moment.'}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Form</th>
                <th scope="col">Audience</th>
                <th scope="col">Questions</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible?.map((form) => (
                <tr key={form.id}>
                  <th scope="row">
                    {form.title}
                    <span className="micro row-sub">/{form.slug}</span>
                  </th>
                  <td>
                    <span className={`badge badge-${form.audience}`}>{form.audience}</span>
                  </td>
                  <td className="cell-muted">{form.fields.length}</td>
                  <td>
                    <span className={`badge badge-${form.isOpen ? 'published' : 'draft'}`}>
                      {form.isOpen ? 'open' : 'closed'}
                    </span>
                  </td>
                  <td className="cell-actions">
                    {form.isOpen && form.fields.length > 0 && (
                      <Link className="btn btn-quiet" to={`/forms/${form.id}/fill`}>
                        Fill in
                      </Link>
                    )}
                    {canReadSubmissions && (
                      <Link className="btn btn-quiet" to={`/forms/${form.id}/submissions`}>
                        Responses
                      </Link>
                    )}
                    {canEdit && (
                      <>
                        <Link className="btn btn-quiet" to={`/forms/${form.id}/edit`}>
                          Edit
                        </Link>
                        <button type="button" className="btn btn-quiet" onClick={() => toggle(form)}>
                          {form.isOpen ? 'Close' : 'Reopen'}
                        </button>
                      </>
                    )}
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

export default Forms
