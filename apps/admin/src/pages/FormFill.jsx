import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useAction } from '@mads/db/react'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'

function Field({ field, value, onChange }) {
  const id = `field-${field.id}`
  const shared = {
    id,
    name: field.name,
    value,
    onChange: (event) => onChange(field.name, event.target.value),
  }

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {field.label}
        {!field.required && <span className="micro field-optional"> optional</span>}
      </label>

      {field.type === 'textarea' && <textarea className="field" rows={5} {...shared} />}

      {field.type === 'select' && (
        <select className="field" {...shared}>
          <option value="">Choose one…</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}

      {!['textarea', 'select'].includes(field.type) && (
        <input className="field" type={field.type ?? 'text'} {...shared} />
      )}
    </div>
  )
}

/**
 * Fills in a form from inside the panel.
 *
 * Deliberately not behind a <Gate>: answering a form is not an editorial act.
 * An internal form — a venue reservation, an event proposal — is raised by
 * whoever needs the thing, which includes the president and includes members
 * whose role grants nothing else here. `forms:write` edits the questions and
 * `submissions:read` reads the answers; neither is needed to give one.
 *
 * `blank` is rebuilt on each reset rather than reusing the first object, so
 * a second submission does not start pre-filled with the first one's answers.
 */
function Filler({ form }) {
  const blank = () => Object.fromEntries(form.fields.map((field) => [field.name, '']))
  const [values, setValues] = useState(blank)
  const [done, setDone] = useState(false)
  const submit = useAction((client, payload) => client.submissions.create(form.id, payload))

  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    // On failure the answers stay put and submit.error renders below.
    if ((await submit.run(values)).ok) setDone(true)
  }

  if (done) {
    return (
      <>
        <p className="state state-ok" role="status">Sent. Your response was recorded.</p>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            setValues(blank())
            setDone(false)
          }}
        >
          Fill in another
        </button>
      </>
    )
  }

  // noValidate throughout the panel: jsdom calls a `required` input invalid
  // even when it is filled, which silently blocks submits in tests.
  return (
    <form className="editor" onSubmit={handleSubmit} noValidate>
      {form.fields.map((field) => (
        <Field key={field.id} field={field} value={values[field.name] ?? ''} onChange={set} />
      ))}

      {submit.error && <p className="state state-error" role="alert">{submit.error.message}</p>}

      <button type="submit" className="btn btn-solid" disabled={submit.pending}>
        {submit.pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}

function FormFill() {
  const { id } = useParams()
  const { data: form, loading, error } = useQuery((c) => c.forms.byId(id), [id])

  return (
    <>
      <PageTitle title={form ? form.title : 'Form'} lead={form?.description || undefined}>
        <Link className="btn btn-quiet" to="/forms">Back to forms</Link>
      </PageTitle>

      <AsyncState loading={loading} error={error}>
        {form && !form.isOpen && (
          <p className="state state-empty">This form is closed and is not taking responses.</p>
        )}
        {form && form.isOpen && form.fields.length === 0 && (
          <p className="state state-empty">This form has no questions yet.</p>
        )}
        {form && form.isOpen && form.fields.length > 0 && (
          <Filler key={form.id} form={form} />
        )}
      </AsyncState>
    </>
  )
}

export default FormFill
