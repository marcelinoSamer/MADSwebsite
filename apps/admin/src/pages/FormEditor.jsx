import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useQuery, useAction } from '@mads/db/react'
import { PERMISSIONS, AUDIENCES, AUDIENCE_LABELS, FIELD_TYPES } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { slugify } from '../lib/format'

// Internal, like the adapter's default: a new form reaches the public site
// only because someone chose that, never because they skipped the question.
const BLANK = {
  title: '',
  slug: '',
  description: '',
  audience: 'internal',
  fields: [],
}

const TYPE_LABELS = {
  text: 'Short text',
  textarea: 'Long text',
  email: 'Email',
  number: 'Number',
  date: 'Date',
  select: 'Choose one',
}

const newField = () => ({
  id: globalThis.crypto.randomUUID(),
  name: '',
  label: '',
  type: 'text',
  required: false,
  options: [],
})

/** One question. Answers are keyed by `name`, so the name is part of the data. */
function FieldRow({ field, index, count, onChange, onMove, onRemove }) {
  const [nameTouched, setNameTouched] = useState(Boolean(field.name))
  const id = `field-${field.id}`

  // The name follows the label until someone edits it, then it is theirs —
  // renaming a field orphans every answer already stored under the old key.
  function setLabel(value) {
    onChange({ ...field, label: value, name: nameTouched ? field.name : slugify(value) })
  }

  return (
    <li className="field-row">
      <div className="field-row-head">
        <span className="micro field-row-index">Question {index + 1}</span>
        <div className="field-row-actions">
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
          >
            Move up
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => onMove(index + 1)}
            disabled={index === count - 1}
          >
            Move down
          </button>
          <button type="button" className="btn btn-quiet" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      <div className="field-row-grid">
        <div className="form-field">
          <label htmlFor={`${id}-label`}>Question</label>
          <input
            id={`${id}-label`}
            className="field"
            value={field.label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor={`${id}-type`}>Answer type</label>
          <select
            id={`${id}-type`}
            className="field"
            value={field.type}
            onChange={(event) => onChange({ ...field, type: event.target.value })}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type] ?? type}</option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor={`${id}-name`}>Name</label>
          <input
            id={`${id}-name`}
            className="field"
            value={field.name}
            onChange={(event) => {
              setNameTouched(true)
              onChange({ ...field, name: event.target.value })
            }}
          />
          <p className="micro field-hint">
            The column this answer is stored and exported under.
          </p>
        </div>

        <div className="form-field form-field-check">
          <input
            id={`${id}-required`}
            type="checkbox"
            checked={field.required}
            onChange={(event) => onChange({ ...field, required: event.target.checked })}
          />
          <label htmlFor={`${id}-required`}>Required</label>
        </div>
      </div>

      {field.type === 'select' && (
        <div className="form-field">
          <label htmlFor={`${id}-options`}>Options</label>
          <textarea
            id={`${id}-options`}
            className="field"
            rows={3}
            value={field.options?.join('\n') ?? ''}
            onChange={(event) =>
              onChange({
                ...field,
                options: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
              })
            }
          />
          <p className="micro field-hint">One per line.</p>
        </div>
      )}
    </li>
  )
}

function Editor({ initial, isNew }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [draft, setDraft] = useState(initial)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [saved, setSaved] = useState(Boolean(location.state?.justSaved))

  const create = useAction((client, input) => client.forms.create(input))
  const update = useAction((client, formId, patch) => client.forms.update(formId, patch))

  const set = (key, value) => {
    setSaved(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function setTitle(value) {
    setSaved(false)
    setDraft((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : slugify(value),
    }))
  }

  // Functional, because a keystroke in one question and a click on another
  // can land between renders; `draft.fields` from this render would be stale.
  const editFields = (fn) => {
    setSaved(false)
    setDraft((current) => ({ ...current, fields: fn(current.fields) }))
  }

  const moveField = (from, to) =>
    editFields((fields) => {
      if (to < 0 || to >= fields.length) return fields
      const next = [...fields]
      next.splice(to, 0, ...next.splice(from, 1))
      return next
    })

  async function handleSubmit(event) {
    event.preventDefault()

    const patch = {
      title: draft.title,
      slug: draft.slug,
      description: draft.description,
      audience: draft.audience,
      fields: draft.fields,
    }
    const result = isNew ? await create.run(patch) : await update.run(id, patch)

    // Nothing typed is lost on failure — the draft stays and the error shows.
    if (!result.ok) return

    if (isNew) {
      navigate(`/forms/${result.data.id}/edit`, { replace: true, state: { justSaved: true } })
      return
    }
    setSaved(true)
  }

  const error = create.error || update.error
  const saving = create.pending || update.pending

  return (
    <>
      <PageTitle title={isNew ? 'New form' : 'Edit form'}>
        <Link className="btn btn-quiet" to="/forms">Back to forms</Link>
        {!isNew && (
          <Link className="btn btn-quiet" to={`/forms/${id}/fill`}>Fill in</Link>
        )}
      </PageTitle>

      {error && <p className="state state-error" role="alert">{error.message}</p>}
      {saved && <p className="state state-ok" role="status">Saved.</p>}

      <form className="editor" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            className="field"
            value={draft.title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            className="field"
            value={draft.slug}
            onChange={(event) => {
              setSlugTouched(true)
              set('slug', event.target.value)
            }}
          />
          <p className="micro field-hint">
            {draft.audience === 'public'
              ? `On the site at /forms/${draft.slug || '…'}`
              : 'Internal forms have no public URL. The slug identifies the form here.'}
          </p>
        </div>

        <div className="form-field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            className="field"
            rows={2}
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
          />
          <p className="micro field-hint">Shown above the questions.</p>
        </div>

        <fieldset className="form-field form-fieldset">
          <legend>Who fills this in</legend>
          {AUDIENCES.map((audience) => (
            <div key={audience} className="form-field-check">
              <input
                id={`audience-${audience}`}
                type="radio"
                name="audience"
                value={audience}
                checked={draft.audience === audience}
                onChange={() => set('audience', audience)}
              />
              <label htmlFor={`audience-${audience}`}>{AUDIENCE_LABELS[audience]}</label>
            </div>
          ))}
          <p className="micro field-hint">
            Internal forms never appear on the public site. Everyone signed in here can fill one
            in, whatever their role.
          </p>
        </fieldset>

        <div className="form-field">
          <div className="field-header">
            <span className="field-legend" id="questions-label">Questions</span>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => editFields((fields) => [...fields, newField()])}
            >
              Add question
            </button>
          </div>

          {draft.fields.length === 0 ? (
            <p className="state state-empty">No questions yet.</p>
          ) : (
            <ul className="field-rows" aria-labelledby="questions-label">
              {draft.fields.map((field, index) => (
                <FieldRow
                  key={field.id}
                  field={field}
                  index={index}
                  count={draft.fields.length}
                  onChange={(next) =>
                    editFields((fields) => fields.map((f) => (f.id === field.id ? next : f)))
                  }
                  onMove={(to) => moveField(index, to)}
                  onRemove={() =>
                    editFields((fields) => fields.filter((f) => f.id !== field.id))
                  }
                />
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="btn btn-solid" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create form' : 'Save changes'}
        </button>
      </form>
    </>
  )
}

/**
 * Loads the form, then mounts the editor keyed on its id with the data as
 * initial state — the same shape as PostEditor, and for the same reason: an
 * effect copying fetched data into state would overwrite a half-typed draft.
 */
function EditorLoader() {
  const { id } = useParams()
  const isNew = !id
  const existing = useQuery((c) => (isNew ? null : c.forms.byId(id)), [id, isNew])

  if (isNew) return <Editor initial={BLANK} isNew />

  return (
    <AsyncState loading={existing.loading} error={existing.error}>
      {existing.data && <Editor key={existing.data.id} initial={existing.data} isNew={false} />}
    </AsyncState>
  )
}

function FormEditor() {
  return (
    <Gate need={[PERMISSIONS.FORMS_WRITE]}>
      <EditorLoader />
    </Gate>
  )
}

export default FormEditor
