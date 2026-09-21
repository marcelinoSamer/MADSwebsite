import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import Markdown from 'react-markdown'
import { useQuery, useAction, useCan } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { slugify } from '../lib/format'

const BLANK = { title: '', slug: '', excerpt: '', bodyMd: '' }

function Editor({ initial, isNew }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const canPublish = useCan(PERMISSIONS.POSTS_PUBLISH)

  // Creating a post navigates to its edit URL, which remounts this component.
  // The confirmation rides along in router state so it survives that.
  const [draft, setDraft] = useState(initial)
  // An existing post's slug is already its own; only a new post's tracks the
  // title.
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState(Boolean(location.state?.justSaved))

  const create = useAction((client, input) => client.posts.create(input))
  const update = useAction((client, postId, patch) => client.posts.update(postId, patch))
  const publish = useAction((client, postId, status) => client.posts.update(postId, { status }))

  const set = (key, value) => {
    setSaved(false)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  // Slug follows the title until someone edits it by hand — after that it is
  // theirs, because changing a slug breaks every link already shared.
  function setTitle(value) {
    setSaved(false)
    setDraft((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : slugify(value),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const result = isNew
      ? await create.run(draft)
      : await update.run(id, {
          title: draft.title,
          slug: draft.slug,
          excerpt: draft.excerpt,
          bodyMd: draft.bodyMd,
        })

    // The draft stays on screen on failure, so nothing typed is lost.
    if (!result.ok) return

    if (isNew) {
      navigate(`/posts/${result.data.id}`, { replace: true, state: { justSaved: true } })
      return
    }
    setSaved(true)
  }

  async function togglePublished() {
    const next = draft.status === 'published' ? 'draft' : 'published'
    const result = await publish.run(id, next)
    if (result.ok) setDraft(result.data)
  }

  const saveError = create.error || update.error || publish.error
  const saving = create.pending || update.pending

  return (
    <>
      <PageTitle title={isNew ? 'New post' : 'Edit post'}>
        <Link className="btn btn-quiet" to="/posts">Back to posts</Link>
        {!isNew && canPublish && (
          <button type="button" className="btn btn-solid" onClick={togglePublished}>
            {draft.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        )}
      </PageTitle>

      {!isNew && !canPublish && draft.status !== 'published' && (
        <p className="state state-note">
          You can write and save this, but publishing it to the live site needs a role with
          publish rights.
        </p>
      )}

      {saveError && <p className="state state-error" role="alert">{saveError.message}</p>}
      {saved && <p className="state state-ok" role="status">Saved.</p>}

      <form className="editor" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            className="field"
            value={draft.title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            className="field"
            value={draft.slug}
            onChange={(event) => {
              setSlugTouched(true)
              set('slug', event.target.value)
            }}
            required
          />
          <p className="micro field-hint">The post will live at /blog/{draft.slug || '…'}</p>
        </div>

        <div className="form-field">
          <label htmlFor="excerpt">Excerpt</label>
          <textarea
            id="excerpt"
            className="field"
            rows={2}
            value={draft.excerpt}
            onChange={(event) => set('excerpt', event.target.value)}
          />
          <p className="micro field-hint">Shown on the blog index, not on the post itself.</p>
        </div>

        <div className="form-field">
          <div className="field-header">
            <label htmlFor="body">Body</label>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setPreview((on) => !on)}
              aria-pressed={preview}
            >
              {preview ? 'Write' : 'Preview'}
            </button>
          </div>

          {preview ? (
            <div className="editor-preview prose">
              <Markdown>{draft.bodyMd || '*Nothing to preview yet.*'}</Markdown>
            </div>
          ) : (
            <textarea
              id="body"
              className="field editor-body"
              rows={18}
              value={draft.bodyMd}
              onChange={(event) => set('bodyMd', event.target.value)}
              placeholder={'## A heading\n\nMarkdown. Headings, lists, links, and bold.'}
            />
          )}
        </div>

        <button type="submit" className="btn btn-solid" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create draft' : 'Save changes'}
        </button>
      </form>
    </>
  )
}

/**
 * Loads the post, then mounts the editor with it as initial state.
 *
 * The editor is keyed on the post id so navigating between two posts gives a
 * fresh form rather than an effect copying new data over a half-typed draft.
 */
function EditorLoader() {
  const { id } = useParams()
  const isNew = !id
  const existing = useQuery((c) => (isNew ? null : c.posts.byId(id)), [id, isNew])

  if (isNew) return <Editor initial={BLANK} isNew />

  return (
    <AsyncState loading={existing.loading} error={existing.error}>
      {existing.data && <Editor key={existing.data.id} initial={existing.data} isNew={false} />}
    </AsyncState>
  )
}

function PostEditor() {
  return (
    <Gate need={[PERMISSIONS.POSTS_WRITE]}>
      <EditorLoader />
    </Gate>
  )
}

export default PostEditor
