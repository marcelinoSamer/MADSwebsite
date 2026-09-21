import { useQuery, useAction, useSession } from '@mads/db/react'
import { PERMISSIONS, PERMISSION_LABELS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'

function Roster() {
  const { user } = useSession()
  const members = useQuery((c) => c.members.list())
  const roles = useQuery((c) => c.roles.list())
  const setRole = useAction((client, id, roleId) => client.members.update(id, { roleId }))

  async function changeRole(memberId, roleId) {
    if ((await setRole.run(memberId, roleId)).ok) members.refetch()
  }

  return (
    <>
      <PageTitle
        title="Members"
        lead="Who can sign in, and what each role is allowed to do."
      />

      {setRole.error && <p className="state state-error" role="alert">{setRole.error.message}</p>}

      <AsyncState
        loading={members.loading || roles.loading}
        error={members.error || roles.error}
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.data?.map((member) => (
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
                      disabled={member.id === user?.id}
                    >
                      {roles.data?.map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                    {member.id === user?.id && (
                      <span className="micro row-sub">You cannot change your own role.</span>
                    )}
                  </td>
                </tr>
              ))}
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
