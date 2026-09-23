import { useState } from 'react'
import { useQuery, useAction, useSession } from '@mads/db/react'
import { PERMISSIONS, PERMISSION_LABELS, MIN_PASSWORD_LENGTH } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { formatDate } from '../lib/format'

/**
 * Suggest a temporary password rather than making someone invent one.
 *
 * It is handed over in person and changed on first sign-in; the point is
 * only that it is not "mads2026".
 */
function suggestPassword() {
  const bytes = new Uint8Array(12)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16)
}

function AddMember({ roles, onAdded }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [password, setPassword] = useState(suggestPassword)

  const create = useAction((client, input) => client.members.create(input))

  async function handleSubmit(event) {
    event.preventDefault()

    const result = await create.run({ fullName, email, roleId, password })
    // On failure the form stays filled in so it can be corrected and retried;
    // `create.error` is already rendering below.
    if (!result.ok) return

    onAdded({ member: result.data, password })
    setFullName('')
    setEmail('')
    setRoleId('')
    setPassword(suggestPassword())
  }

  // Validated in JS, not natively — the same reason as every other form here.
  return (
    <form className="panel form-inline" onSubmit={handleSubmit} noValidate>
      <h2>Add a member</h2>

      <div className="form-field">
        <label htmlFor="member-name">Full name</label>
        <input
          id="member-name"
          className="field"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="off"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="member-email">Email</label>
        <input
          id="member-email"
          className="field"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="member-role">Role</label>
        <select
          id="member-role"
          className="field"
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          required
        >
          <option value="">Choose a role…</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <div className="field-header">
          <label htmlFor="member-password">Temporary password</label>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => setPassword(suggestPassword())}
          >
            Suggest another
          </button>
        </div>
        {/* Deliberately a text input: it is read aloud or copied to the new
            member, never typed from memory, so masking it helps nobody. */}
        <input
          id="member-password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="off"
          spellCheck="false"
          required
        />
        <p className="micro field-hint">
          At least {MIN_PASSWORD_LENGTH} characters. Hand it over directly and ask them to
          change it.
        </p>
      </div>

      {create.error && <p className="state state-error" role="alert">{create.error.message}</p>}

      <button
        type="submit"
        className="btn btn-solid"
        disabled={create.pending || !fullName.trim() || !email.trim() || !roleId}
      >
        {create.pending ? 'Adding…' : 'Add member'}
      </button>
    </form>
  )
}

function Roster() {
  const { user } = useSession()
  const members = useQuery((c) => c.members.list())
  const roles = useQuery((c) => c.roles.list())

  const setRole = useAction((client, id, roleId) => client.members.update(id, { roleId }))
  const remove = useAction((client, id) => client.members.remove(id))

  const [added, setAdded] = useState(null)
  // Deleting an account is irreversible and the row is one click from a role
  // dropdown, so Remove arms first and deletes second. A window.confirm would
  // be shorter and would also block the whole tab.
  const [confirming, setConfirming] = useState(null)

  async function changeRole(memberId, roleId) {
    if ((await setRole.run(memberId, roleId)).ok) members.refetch()
  }

  async function handleRemove(memberId) {
    setConfirming(null)
    if ((await remove.run(memberId)).ok) {
      setAdded(null)
      members.refetch()
    }
  }

  function handleAdded(result) {
    setAdded(result)
    members.refetch()
  }

  const roleName = (roleId) => roles.data?.find((r) => r.id === roleId)?.name ?? roleId

  return (
    <>
      <PageTitle
        title="Members"
        lead="Who can sign in, what each role is allowed to do, and who gets an account."
      />

      <AsyncState
        loading={members.loading || roles.loading}
        error={members.error || roles.error}
      >
        {roles.data && <AddMember roles={roles.data} onAdded={handleAdded} />}

        {added && (
          <p className="state state-ok" role="status">
            {added.member.fullName} can now sign in as {roleName(added.member.roleId)}.
            Their temporary password is <code>{added.password}</code> — this is the last
            time it is shown.
          </p>
        )}

        {setRole.error && <p className="state state-error" role="alert">{setRole.error.message}</p>}
        {remove.error && <p className="state state-error" role="alert">{remove.error.message}</p>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Added</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {members.data?.map((member) => {
                const isSelf = member.id === user?.id

                return (
                  <tr key={member.id}>
                    <th scope="row">{member.fullName}</th>
                    <td className="cell-muted">{member.email}</td>
                    <td>
                      <select
                        className="field field-inline"
                        value={member.roleId}
                        aria-label={`Role for ${member.fullName}`}
                        onChange={(event) => changeRole(member.id, event.target.value)}
                        // Demoting yourself locks you out of this very page,
                        // and there may be no other president to undo it.
                        disabled={isSelf}
                      >
                        {roles.data?.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="cell-muted cell-nowrap">{formatDate(member.createdAt)}</td>
                    <td className="cell-actions">
                      {isSelf ? (
                        <span className="micro cell-muted">This is you</span>
                      ) : confirming === member.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleRemove(member.id)}
                            disabled={remove.pending}
                          >
                            Delete for good
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet"
                            onClick={() => setConfirming(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => setConfirming(member.id)}
                          aria-label={`Remove ${member.fullName}`}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <section className="panel">
          <h2>What each role can do</h2>
          <dl className="role-list">
            {roles.data?.map((role) => (
              <div key={role.id} className="role-item">
                <dt>
                  {role.name}
                  <span className="micro row-sub">{role.description}</span>
                </dt>
                <dd>
                  <ul className="chip-list">
                    {role.permissions.map((permission) => (
                      <li key={permission} className="chip chip-static">
                        {PERMISSION_LABELS[permission] ?? permission}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </AsyncState>
    </>
  )
}

function Members() {
  return (
    <Gate need={[PERMISSIONS.MEMBERS_WRITE]}>
      <Roster />
    </Gate>
  )
}

export default Members
