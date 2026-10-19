import { useState } from 'react'
import { useAction } from '@mads/db/react'
import { SCALE_LIMITS } from '@mads/db'

/**
 * One question. The same shapes as the admin panel's FormFill draws — any
 * field list the form builder can produce has to render here — in the site's
 * own classes. A checkbox answer is an array of the options ticked.
 */
function Field({ field, value, onChange }) {
  const id = `field-${field.id}`
  const optional = !field.required && <span className="micro field-optional"> optional</span>
  const help = field.help && <p className="question-help" id={`${id}-help`}>{field.help}</p>
  const describedBy = field.help ? `${id}-help` : undefined

  if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'scale') {
    const options = field.type === 'scale' ? scalePoints(field) : field.options ?? []
    const multiple = field.type === 'checkbox'
    const chosen = multiple ? (Array.isArray(value) ? value : []) : value

    function pick(option, on) {
      if (!multiple) return onChange(field.name, option)
      onChange(field.name, on ? [...chosen, option] : chosen.filter((o) => o !== option))
    }

    return (
      <fieldset className="choice-group" aria-describedby={describedBy}>
        <legend>
          {field.label}
          {optional}
        </legend>
        {help}
        <div className={field.type === 'scale' ? 'scale' : 'choice-options'}>
          {field.type === 'scale' && field.minLabel && (
            <span className="scale-end">{field.minLabel}</span>
          )}
          {options.map((option, index) => {
            const optionId = `${id}-${index}`
            return (
              <div key={option} className="choice">
                <input
                  id={optionId}
                  type={multiple ? 'checkbox' : 'radio'}
                  name={field.name}
                  value={option}
                  checked={multiple ? chosen.includes(option) : chosen === option}
                  onChange={(event) => pick(option, event.target.checked)}
                />
                <label htmlFor={optionId}>{option}</label>
              </div>
            )
          })}
          {field.type === 'scale' && field.maxLabel && (
            <span className="scale-end">{field.maxLabel}</span>
          )}
        </div>
      </fieldset>
    )
  }

  const shared = {
    id,
    name: field.name,
    required: field.required,
    value,
    'aria-describedby': describedBy,
    onChange: (event) => onChange(field.name, event.target.value),
  }

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {field.label}
        {optional}
      </label>
      {help}

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

/** The points on a linear scale, as the strings an answer is stored as. */
function scalePoints(field) {
  const min = Number(field.scaleMin ?? SCALE_LIMITS.defaultMin)
  const max = Number(field.scaleMax ?? SCALE_LIMITS.defaultMax)
  return Array.from({ length: max - min + 1 }, (_, i) => String(min + i))
}

/**
 * Renders a form from its stored definition.
 *
 * Forms are data, not components — adding one is a row in `forms`, so this
 * has to handle any field list the admin panel can produce.
 */
function FormRenderer({ form, onSubmitted }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      form.fields.map((field) => [field.name, field.type === 'checkbox' ? [] : '']),
    ),
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
