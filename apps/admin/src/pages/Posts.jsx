import { Link } from 'react-router'
import { useQuery, useAction, useCan } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { formatDate } from '../lib/format'

function PostsTable() {
  const { data: posts, loading, error, refetch } = useQuery((c) => c.posts.list())
  const canWrite = useCan(PERMISSIONS.POSTS_WRITE)
  const canPublish = useCan(PERMISSIONS.POSTS_PUBLISH)

  const setStatus = useAction((client, id, status) => client.posts.update(id, { status }))
  const remove = useAction((client, id) => client.posts.remove(id))

  async function toggle(post) {
    const next = post.status === 'published' ? 'draft' : 'published'
    if ((await setStatus.run(post.id, next)).ok) refetch()
  }

  async function handleRemove(post) {
    if ((await remove.run(post.id)).ok) refetch()
  }

  const actionError = setStatus.error || remove.error

  return (
    <>
      <PageTitle title="Posts" lead="Everything that appears on the public blog.">
        {canWrite && (
          <Link className="btn btn-solid" to="/posts/new">New post</Link>
        )}
      </PageTitle>

      {actionError && (
        <p className="state state-error" role="alert">{actionError.message}</p>
      )}

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={posts?.length === 0}
        empty="No posts yet."
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Published</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {posts?.map((post) => (
                <tr key={post.id}>
                  <th scope="row">
                    {canWrite ? (
                      <Link to={`/posts/${post.id}`}>{post.title}</Link>
                    ) : (
                      post.title
                    )}
                    <span className="micro row-sub">/{post.slug}</span>
                  </th>
                  <td>
                    <span className={`badge badge-${post.status}`}>{post.status}</span>
                  </td>
                  <td className="cell-muted">{formatDate(post.publishedAt) || '—'}</td>
                  <td className="cell-actions">
                    {canPublish && (
                      <button type="button" className="btn btn-quiet" onClick={() => toggle(post)}>
                        {post.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                    )}
                    {canWrite && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleRemove(post)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </>
  )
}

function Posts() {
  return (
    <Gate need={[PERMISSIONS.POSTS_READ]}>
      <PostsTable />
    </Gate>
  )
}

export default Posts
