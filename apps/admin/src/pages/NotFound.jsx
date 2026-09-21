import { Link } from 'react-router'
import PageTitle from '../components/PageTitle'

function NotFound() {
  return (
    <>
      <PageTitle title="Not found" lead="That page does not exist in the admin panel.">
        <Link className="btn btn-quiet" to="/">Back to overview</Link>
      </PageTitle>
    </>
  )
}

export default NotFound
