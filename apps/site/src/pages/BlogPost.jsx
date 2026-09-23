import { Link, useParams } from 'react-router'
import Markdown from 'react-markdown'
import { useQuery } from '@mads/db/react'
import AsyncState from '../components/AsyncState'
import { formatDate, readingTime } from '../lib/format'

function BlogPost() {
  const { slug } = useParams()
  const { data: post, loading, error } = useQuery((c) => c.posts.bySlug(slug), [slug])

  // The published list, for the two links at the foot. It is the same query
  // the index page runs, and a reader who finishes a post should not have to
  // go back to the index to find the next one.
  const { data: posts } = useQuery((c) => c.posts.list({ status: 'published' }))

  // A draft has a slug but is not public. Treat a direct hit on one the same
  // as a missing post rather than rendering unpublished copy.
  const unavailable = post && post.status !== 'published'

  const index = posts && post ? posts.findIndex((p) => p.id === post.id) : -1
  // The list is newest first, so the entry before this one is the newer post.
  const newer = index > 0 ? posts[index - 1] : null
  const older = index >= 0 ? (posts[index + 1] ?? null) : null

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
                <Link to="/blog" className="micro post-back">
                  <span aria-hidden="true">←</span> All posts
                </Link>

                <header className="post-head">
                  <p className="post-meta micro">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{readingTime(post.bodyMd)}</span>
                  </p>

                  <h1>{post.title}</h1>

                  {/* The excerpt is written as a summary of the post, so it
                      does the job of a standfirst without asking the author
                      for a second piece of copy. */}
                  {post.excerpt && <p className="post-standfirst">{post.excerpt}</p>}
                </header>

                <div className="prose">
                  <Markdown>{post.bodyMd}</Markdown>
                </div>

                {(newer || older) && (
                  <nav className="post-nav" aria-label="More posts">
                    {newer && (
                      <Link to={`/blog/${newer.slug}`} className="post-nav-link">
                        <span className="micro">Newer</span>
                        <span className="post-nav-title">{newer.title}</span>
                      </Link>
                    )}
                    {older && (
                      <Link
                        to={`/blog/${older.slug}`}
                        className="post-nav-link post-nav-older"
                      >
                        <span className="micro">Older</span>
                        <span className="post-nav-title">{older.title}</span>
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )
          )}
        </AsyncState>
      </div>
    </article>
  )
}

export default BlogPost
