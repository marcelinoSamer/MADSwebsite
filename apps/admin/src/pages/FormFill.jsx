import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useAction } from '@mads/db/react'
import { SCALE_LIMITS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'

/**
 * One question, drawn from its stored definition.
 *
 * Choice questions are a fieldset of radios or checkboxes so each option is
 * its own labelled control. A checkbox answer is an array of the options
 * ticked; every other answer is a string.
 */
function Field({ field, value, onChange }) {
  const id = `field-${field.id}`
  const optional = !field.required && <span className="micro field-optional"> optional</span>
  const help = field.help && <p className="question-help" id={`${id}-help`}>{field.help}</p>
  const describedBy = field.help ? `${id}-help` : undefined

  if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'scale') {
    const options =
      field.type === 'scale'
        ? scalePoints(field)
        : field.options ?? []
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
              <div key={option} className="form-field-check">
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
  const blank = () =>
    Object.fromEntries(form.fields.map((field) => [field.name, field.type === 'checkbox' ? [] : '']))
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
