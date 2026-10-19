import { useState } from 'react'
import { useQuery, useAction } from '@mads/db/react'
import { PERMISSIONS, formatEventWhen, todayIso } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'

const BLANK = {
  title: '',
  date: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  description: '',
  isPublic: true,
}

/** Stored nulls become empty inputs; the adapter turns them back into nulls. */
const toDraft = (event) =>
  Object.fromEntries(Object.keys(BLANK).map((key) => [key, event[key] ?? BLANK[key]]))

/**
 * The add and edit form for one event. Mounted keyed on the event id (or
 * "new") with the stored event as initial state, so a refetch of the list
 * never overwrites what is being typed.
 */
function EventForm({ initial, idPrefix, submitLabel, onSubmit, onCancel, pending, error }) {
  const [draft, setDraft] = useState(initial)
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const field = (key) => `${idPrefix}-${key}`

  async function handleSubmit(event) {
    event.preventDefault()
    const ok = await onSubmit(draft)
    if (ok && !onCancel) setDraft(initial)
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-inline">
        <div className="form-field form-field-wide">
          <label htmlFor={field('title')}>Title</label>
          <input
            id={field('title')}
            className="field"
            value={draft.title}
            onChange={(event) => set('title', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={field('date')}>Date</label>
          <input
            id={field('date')}
            type="date"
            className="field"
            value={draft.date}
            onChange={(event) => set('date', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={field('endDate')}>
            Last day <span className="micro field-optional">optional</span>
          </label>
          <input
            id={field('endDate')}
            type="date"
            className="field"
            value={draft.endDate}
            min={draft.date || undefined}
            onChange={(event) => set('endDate', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={field('startTime')}>
            Starts <span className="micro field-optional">optional</span>
          </label>
          <input
            id={field('startTime')}
            type="time"
            className="field"
            value={draft.startTime}
            onChange={(event) => set('startTime', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={field('endTime')}>
            Ends <span className="micro field-optional">optional</span>
          </label>
          <input
            id={field('endTime')}
            type="time"
            className="field"
            value={draft.endTime}
            disabled={!draft.startTime}
            onChange={(event) => set('endTime', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={field('location')}>
            Where <span className="micro field-optional">optional</span>
          </label>
          <input
            id={field('location')}
            className="field"
            value={draft.location}
            onChange={(event) => set('location', event.target.value)}
          />
        </div>
      </div>

      <div className="form-field">
        <label htmlFor={field('description')}>
          Details <span className="micro field-optional">optional</span>
        </label>
        <textarea
          id={field('description')}
          className="field"
          rows={2}
          value={draft.description}
          onChange={(event) => set('description', event.target.value)}
        />
      </div>

      <div className="form-field form-field-check">
        <input
          id={field('isPublic')}
          type="checkbox"
          checked={draft.isPublic}
          onChange={(event) => set('isPublic', event.target.checked)}
        />
        <label htmlFor={field('isPublic')}>Show on the public site</label>
      </div>
      <p className="micro field-hint event-hint">
        No start time makes it an all-day event. Unticked events are visible to members only.
      </p>

      {error && <p className="state state-error" role="alert">{error.message}</p>}

      <div className="role-editor-actions">
        <button type="submit" className="btn btn-solid" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-quiet" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

function EventRow({ event, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const update = useAction((client, patch) => client.events.update(event.id, patch))
  const remove = useAction((client) => client.events.remove(event.id))

  async function handleSave(draft) {
    const result = await update.run(draft)
    if (!result.ok) return false
    setEditing(false)
    onChanged()
    return true
  }

  async function handleRemove() {
    setConfirming(false)
    if ((await remove.run()).ok) onChanged()
  }

  if (editing) {
    return (
      <li className="event-item event-item-editing">
        <EventForm
          initial={toDraft(event)}
          idPrefix={`event-${event.id}`}
          submitLabel="Save event"
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
          pending={update.pending}
          error={update.error}
        />
      </li>
    )
  }

  return (
    <li className="event-item">
      <div className="event-when">{formatEventWhen(event)}</div>
      <div className="event-what">
        <h3>
          {event.title}
          {!event.isPublic && <span className="badge badge-internal">members only</span>}
        </h3>
        {(event.location || event.description) && (
          <p>{[event.location, event.description].filter(Boolean).join(' · ')}</p>
        )}
        {remove.error && <p className="state state-error" role="alert">{remove.error.message}</p>}
      </div>
      <div className="cell-actions">
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${event.title}`}
        >
          Edit
        </button>
        {confirming ? (
          <>
            <button type="button" className="btn btn-danger" onClick={handleRemove}>
              Delete for good
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirming(true)}
            aria-label={`Remove ${event.title}`}
          >
            Remove
          </button>
        )}
      </div>
    </li>
  )
}

function EventList({ title, events, onChanged, empty }) {
  return (
    <section className="event-section" aria-label={title}>
      <h2 className="section-heading">{title}</h2>
      {events.length === 0 ? (
        <p className="state state-empty">{empty}</p>
      ) : (
        <ol className="event-list">
          {events.map((event) => (
            <EventRow key={event.id} event={event} onChanged={onChanged} />
          ))}
        </ol>
      )}
    </section>
  )
}

function Planner() {
  const events = useQuery((c) => c.events.list())
  const create = useAction((client, input) => client.events.create(input))
  const [added, setAdded] = useState(null)

  async function handleCreate(draft) {
    const result = await create.run(draft)
    if (!result.ok) return false
    setAdded(result.data.title)
    events.refetch()
    return true
  }

  // An event still running today counts as upcoming, so the datathon does not
  // drop into "Past" on its first morning.
  const today = todayIso()
  const upcoming = events.data?.filter((e) => (e.endDate ?? e.date) >= today) ?? []
  const past = (events.data?.filter((e) => (e.endDate ?? e.date) < today) ?? []).reverse()

  return (
    <>
      <PageTitle
        title="Calendar"
        lead="Events here appear in the calendar on the site's homepage, unless they are marked members only."
      />

      <section className="panel">
        <h2>Add an event</h2>
        <EventForm
          initial={BLANK}
          idPrefix="event-new"
          submitLabel="Add event"
          onSubmit={handleCreate}
          pending={create.pending}
          error={create.error}
        />
        {added && !create.error && (
          <p className="state state-ok" role="status">{added} is on the calendar.</p>
        )}
      </section>

      <AsyncState loading={events.loading} error={events.error}>
        <EventList
          title="Upcoming"
          events={upcoming}
          onChanged={events.refetch}
          empty="Nothing scheduled yet."
        />
        <EventList title="Past" events={past} onChanged={events.refetch} empty="No past events." />
      </AsyncState>
    </>
  )
}

function Calendar() {
  return (
    <Gate need={[PERMISSIONS.EVENTS_WRITE]}>
      <Planner />
    </Gate>
  )
}

export default Calendar
