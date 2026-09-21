import { Link } from 'react-router'
import { useQuery } from '@mads/db/react'
import PageHead from '../components/PageHead'
import AsyncState from '../components/AsyncState'
import Reveal from '../components/Reveal'
import { formatDate } from '../lib/format'

function Blog() {
  const { data: posts, loading, error } = useQuery((c) => c.posts.list({ status: 'published' }))

  return (
    <>
      <PageHead
        mark="§ 05"
        eyebrow="Writing"
        title="Notes from the association."
        lead="Recaps, announcements, and the occasional argument about methodology."
      />

      <section className="section page-body">
        <div className="container">
          <AsyncState
            loading={loading}
            error={error}
            isEmpty={posts?.length === 0}
            empty="No posts yet. The first one is being written."
          >
            <div className="post-list">
              {posts?.map((post, i) => (
                <Reveal key={post.id} className="post-row" delay={i * 0.06} y={20}>
                  <Link to={`/blog/${post.slug}`} className="post-row-link">
                    <span className="micro post-date">{formatDate(post.publishedAt)}</span>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    <span className="post-more micro" aria-hidden="true">Read →</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </AsyncState>
        </div>
      </section>
    </>
  )
}

export default Blog
