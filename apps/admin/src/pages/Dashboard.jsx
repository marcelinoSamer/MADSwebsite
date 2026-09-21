import { Link } from 'react-router'
import { useQuery, useSession, useCan } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'

function Stat({ label, value, to }) {
  const body = (
    <>
      <span className="stat-value">{value}</span>
      <span className="micro stat-label">{label}</span>
    </>
  )

  return to ? (
    <Link className="stat stat-link" to={to}>{body}</Link>
  ) : (
    <div className="stat">{body}</div>
  )
}

function Dashboard() {
  const { user, role } = useSession()
  const posts = useQuery((c) => c.posts.list())
  const canSeeSubscribers = useCan(PERMISSIONS.SUBSCRIBERS_READ)
  const canSeeSubmissions = useCan(PERMISSIONS.SUBMISSIONS_READ)

  // Only ask for what this role may read — an unpermitted call would come
  // back as an error and render as a broken tile.
  const subscribers = useQuery(
    (c) => (canSeeSubscribers ? c.subscribers.list() : []),
    [canSeeSubscribers],
  )
  const submissions = useQuery(
    (c) => (canSeeSubmissions ? c.submissions.list() : []),
    [canSeeSubmissions],
  )

  const published = posts.data?.filter((p) => p.status === 'published').length ?? 0
  const drafts = posts.data?.filter((p) => p.status === 'draft').length ?? 0
  const active = subscribers.data?.filter((s) => !s.unsubscribedAt).length ?? 0

  return (
    <>
      <PageTitle
        title="Overview"
        lead={`${user?.fullName} — ${role?.name}.`}
      />

      <div className="stat-row">
        <Stat label="Published posts" value={published} to="/posts" />
        <Stat label="Drafts" value={drafts} to="/posts" />
        {canSeeSubscribers && (
          <Stat label="Active subscribers" value={active} to="/subscribers" />
        )}
        {canSeeSubmissions && (
          <Stat label="Form responses" value={submissions.data?.length ?? 0} to="/forms" />
        )}
      </div>

      <section className="panel">
        <h2>Where things stand</h2>
        <p>
          The newsletter stores sign-ups but does not send yet — that needs an email
          provider wired up server-side.
        </p>
        <p>
          Syllabi are public once uploaded, so anything put in the archive is readable by
          anyone with the link.
        </p>
      </section>
    </>
  )
}

export default Dashboard
