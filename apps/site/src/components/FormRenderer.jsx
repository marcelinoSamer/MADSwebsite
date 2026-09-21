import { useState } from 'react'
import { useAction } from '@mads/db/react'

function Field({ field, value, onChange }) {
  const id = `field-${field.id}`
  const shared = {
    id,
    name: field.name,
    required: field.required,
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
 * Renders a form from its stored definition.
 *
 * Forms are data, not components — adding one is a row in `forms`, so this
 * has to handle any field list the admin panel can produce.
 */
function FormRenderer({ form, onSubmitted }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(form.fields.map((field) => [field.name, ''])),
  )
  const [done, setDone] = useState(false)
  const submit = useAction((client, payload) => client.submissions.create(form.id, payload))

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    // On failure `submit.error` renders below and the answers stay put.
    if (!(await submit.run(values)).ok) return

    setDone(true)
    onSubmitted?.()
  }

  if (done) {
    return (
      <p className="state state-done" role="status">
        Thank you — that reached us.
      </p>
    )
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      {form.fields.map((field) => (
        <Field key={field.id} field={field} value={values[field.name] ?? ''} onChange={setValue} />
      ))}

      {submit.error && (
        <p className="state state-error" role="alert">{submit.error.message}</p>
      )}

      <button type="submit" className="btn btn-solid" disabled={submit.pending}>
        {submit.pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  )
}

export default FormRenderer
