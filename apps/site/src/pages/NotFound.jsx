import { Link } from 'react-router'
import PageHead from '../components/PageHead'

function NotFound() {
  return (
    <PageHead
      mark="§ —"
      eyebrow="Not found"
      title="That page is outside the sample."
      lead="The link may be old, or the page may have moved."
    >
      <p className="page-head-actions">
        <Link className="btn btn-ghost" to="/">Back to the homepage</Link>
      </p>
    </PageHead>
  )
}

export default NotFound
