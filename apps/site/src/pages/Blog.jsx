import { Link } from 'react-router'
import { useQuery } from '@mads/db/react'
import PageHead from '../components/PageHead'
import AsyncState from '../components/AsyncState'
import Reveal from '../components/Reveal'
import { formatDate, readingTime } from '../lib/format'

/**
 * One post, as a card.
 *
 * The whole card is the link — a title-only target is a small one on a phone,
 * and there is nothing else in a card to click. `lead` gives the newest post
 * the full width and a larger title: a blog with four posts a semester needs
 * the most recent one to be unmistakable.
 */
function PostCard({ post, lead = false, delay = 0 }) {
  return (
    <Reveal
      as="article"
      className={`post-card${lead ? ' post-card-lead' : ''}`}
      delay={delay}
      y={18}
    >
      <Link to={`/blog/${post.slug}`} className="post-card-link">
        <p className="post-card-meta micro">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span>{readingTime(post.bodyMd)}</span>
        </p>

        <h2>{post.title}</h2>
        <p className="post-card-excerpt">{post.excerpt}</p>

        <span className="post-card-more micro" aria-hidden="true">
          Read the post <span className="arrow">→</span>
        </span>
      </Link>
    </Reveal>
  )
}

function Blog() {
  const { data: posts, loading, error } = useQuery((c) => c.posts.list({ status: 'published' }))

  const [newest, ...rest] = posts ?? []

  return (
    <>
      <PageHead
        mark="§ 05"
        eyebrow="Writing"
        title="Notes from the association."
        lead="Recaps, announcements, and the occasional argument about methodology."
      >
        {posts?.length > 0 && (
          <Reveal className="page-toolbar" delay={0.16}>
            <p className="result-count micro">
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>
            <p className="result-note micro">Newest first</p>
          </Reveal>
        )}
      </PageHead>

      <section className="section page-body">
        <div className="container">
          <AsyncState
            loading={loading}
            error={error}
            isEmpty={posts?.length === 0}
            empty="No posts yet. The first one is being written."
          >
            {newest && (
              <div className="post-grid">
                <PostCard post={newest} lead />
                {rest.map((post, i) => (
                  <PostCard key={post.id} post={post} delay={Math.min(i + 1, 6) * 0.05} />
                ))}
              </div>
            )}
          </AsyncState>
        </div>
      </section>
    </>
  )
}

export default Blog
