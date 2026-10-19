import { useState } from 'react'
import { useQuery, useAction } from '@mads/db/react'
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PRESIDENT_ROLE_ID,
} from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'

/**
 * Permission checkboxes, grouped by the feature each one unlocks.
 *
 * members:write is not offered: managing members and roles is what makes
 * someone the President, so it is never handed to a role (see PRESIDENT_ONLY).
 * `idPrefix` keeps the ids unique when several editors are on the page.
 */
function PermissionPicker({ idPrefix, value, onChange, disabled = false }) {
  function toggle(permission, on) {
    onChange(on ? [...value, permission] : value.filter((p) => p !== permission))
  }

  return (
    <div className="permission-groups">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.feature} className="form-fieldset permission-group">
          <legend>{group.feature}</legend>
          {group.permissions.map((permission) => {
            const id = `${idPrefix}-${permission}`
            return (
              <div key={permission} className="form-field-check">
                <input
                  id={id}
                  type="checkbox"
                  checked={value.includes(permission)}
                  disabled={disabled}
                  onChange={(event) => toggle(permission, event.target.checked)}
                />
                <label htmlFor={id}>{PERMISSION_LABELS[permission]}</label>
              </div>
            )
          })}
        </fieldset>
      ))}
    </div>
  )
}

function NewRole({ onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState([])
  const create = useAction((client, input) => client.roles.create(input))

  async function handleSubmit(event) {
    event.preventDefault()
    if (!(await create.run({ name, description, permissions })).ok) return
    setName('')
    setDescription('')
    setPermissions([])
    onCreated()
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <h2>Add a role</h2>
      <div className="form-inline">
        <div className="form-field">
          <label htmlFor="role-new-name">Role name</label>
          <input
            id="role-new-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Outreach Head"
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="role-new-description">Description</label>
          <input
            id="role-new-description"
            className="field"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      <PermissionPicker idPrefix="role-new" value={permissions} onChange={setPermissions} />

      {create.error && <p className="state state-error" role="alert">{create.error.message}</p>}

      <button type="submit" className="btn btn-solid" disabled={create.pending || !name.trim()}>
        {create.pending ? 'Adding…' : 'Add role'}
      </button>
    </form>
  )
}

/** Who holds a role, by name — so ticking a box says whose access changes. */
function Holders({ members }) {
  if (!members.length) return <p className="micro cell-muted">Nobody holds this role yet.</p>
  return (
    <ul className="chip-list">
      {members.map((member) => (
        <li key={member.id} className="chip chip-static">{member.fullName}</li>
      ))}
    </ul>
  )
}

/**
 * One role, edited in place. Mounted keyed on the role id with the stored
 * role as initial state — the PostEditor pattern — so a refetch after saving
 * another role does not wipe a half-made change to this one.
 */
function RoleEditor({ role, members, onChanged }) {
  const [draft, setDraft] = useState({
    name: role.name,
    description: role.description,
    permissions: role.permissions,
  })
  const [saved, setSaved] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const update = useAction((client, patch) => client.roles.update(role.id, patch))
  const remove = useAction((client) => client.roles.remove(role.id))

  const dirty =
    draft.name !== role.name ||
    draft.description !== role.description ||
    [...draft.permissions].sort().join() !== [...role.permissions].sort().join()

  const set = (key, value) => {
    setSaved(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(event) {
    event.preventDefault()
    if (!(await update.run(draft)).ok) return
    setSaved(true)
    onChanged()
  }

  async function handleRemove() {
    setConfirming(false)
    if ((await remove.run()).ok) onChanged()
  }

  const prefix = `role-${role.id}`
  const error = update.error || remove.error

  return (
    <form className="panel role-editor" onSubmit={handleSave} noValidate aria-label={role.name}>
      <div className="form-inline">
        <div className="form-field">
          <label htmlFor={`${prefix}-name`}>Role name</label>
          <input
            id={`${prefix}-name`}
            className="field"
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor={`${prefix}-description`}>Description</label>
          <input
            id={`${prefix}-description`}
            className="field"
            value={draft.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>
      </div>

      <div className="form-field">
        <span className="field-legend">Held by</span>
        <Holders members={members} />
      </div>

      <PermissionPicker
        idPrefix={prefix}
        value={draft.permissions}
        onChange={(permissions) => set('permissions', permissions)}
      />

      {error && <p className="state state-error" role="alert">{error.message}</p>}
      {saved && !dirty && <p className="state state-ok" role="status">Saved.</p>}

      <div className="role-editor-actions">
        <button type="submit" className="btn btn-solid" disabled={!dirty || update.pending}>
          {update.pending ? 'Saving…' : `Save ${role.name}`}
        </button>

        {/* The database refuses deleting a role somebody holds, so the page
            says so up front instead of offering a button that will fail. */}
        {members.length > 0 ? (
          <span className="micro cell-muted">Move its members to delete this role</span>
        ) : confirming ? (
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
            aria-label={`Delete the ${role.name} role`}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}

/**
 * The same facts as the role editors, turned around: for each feature, who
 * can use it. This is the question the President actually asks — "who can
 * make forms?" — and otherwise it means reading every role on the page.
 */
function AccessSummary({ roles, members }) {
  const rows = PERMISSION_GROUPS.flatMap((group) =>
    group.permissions.map((permission) => {
      const holding = roles.filter((role) => role.permissions.includes(permission))
      const people = members.filter((member) => holding.some((role) => role.id === member.roleId))
      return { group, permission, holding, people }
    }),
  )

  return (
    <section className="panel" aria-labelledby="access-summary">
      <h2 id="access-summary">Who can do what</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Can</th>
              <th scope="col">Roles</th>
              <th scope="col">Members</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ group, permission, holding, people }) => (
              <tr key={permission}>
                <th scope="row">{group.feature}</th>
                <td className="cell-muted">{PERMISSION_LABELS[permission]}</td>
                <td>{holding.map((role) => role.name).join(', ')}</td>
                <td className="cell-long">{people.map((member) => member.fullName).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function RoleManager() {
  const roles = useQuery((c) => c.roles.list())
  const members = useQuery((c) => c.members.list())

  const refetch = () => {
    roles.refetch()
    members.refetch()
  }

  const holders = (roleId) => (members.data ?? []).filter((m) => m.roleId === roleId)
  const president = roles.data?.find((role) => role.id === PRESIDENT_ROLE_ID)
  const others = roles.data?.filter((role) => role.id !== PRESIDENT_ROLE_ID) ?? []

  return (
    <>
      <PageTitle
        title="Roles"
        lead="Each role is a set of things its members may do. Tick what a role can do and everyone holding it gets that, from their next page load."
      />

      <AsyncState loading={roles.loading || members.loading} error={roles.error || members.error}>
        {president && (
          <section className="panel panel-quiet" aria-label="President">
            <h2>President</h2>
            <p>
              Everything, including members and roles. Held by{' '}
              {holders(PRESIDENT_ROLE_ID).map((m) => m.email).join(', ') || 'the association account'}{' '}
              and nobody else. This role is fixed and cannot be edited, handed out, or deleted.
            </p>
          </section>
        )}

        {roles.data && members.data && (
          <AccessSummary roles={roles.data} members={members.data} />
        )}

        <NewRole onCreated={refetch} />

        <h2 className="section-heading">Roles</h2>
        {others.map((role) => (
          <RoleEditor
            key={role.id}
            role={role}
            members={holders(role.id)}
            onChanged={refetch}
          />
        ))}
      </AsyncState>
    </>
  )
}

function Roles() {
  return (
    <Gate need={[PERMISSIONS.MEMBERS_WRITE]}>
      <RoleManager />
    </Gate>
  )
}

export default Roles
