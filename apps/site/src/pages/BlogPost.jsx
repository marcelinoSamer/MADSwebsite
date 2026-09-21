import { Link, useParams } from 'react-router'
import Markdown from 'react-markdown'
import { useQuery } from '@mads/db/react'
import AsyncState from '../components/AsyncState'
import { formatDate } from '../lib/format'

function BlogPost() {
  const { slug } = useParams()
  const { data: post, loading, error } = useQuery((c) => c.posts.bySlug(slug), [slug])

  // A draft has a slug but is not public. Treat a direct hit on one the same
  // as a missing post rather than rendering unpublished copy.
  const unavailable = post && post.status !== 'published'

  return (
    <article className="section post">
      <div className="container post-inner">
        <AsyncState loading={loading} error={error}>
          {unavailable ? (
            <p className="state state-empty">
              This post is not published yet. <Link to="/blog">Back to all posts</Link>
            </p>
          ) : (
            post && (
              <>
                <header className="post-head">
                  <Link to="/blog" className="micro post-back">← All posts</Link>
                  <h1>{post.title}</h1>
                  <p className="micro post-date">{formatDate(post.publishedAt)}</p>
                </header>

                <div className="prose">
                  <Markdown>{post.bodyMd}</Markdown>
                </div>
              </>
            )
          )}
        </AsyncState>
      </div>
    </article>
  )
}

export default BlogPost
