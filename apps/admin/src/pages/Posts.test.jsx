import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

const rowFor = async (title) => {
  const cell = await screen.findByRole('rowheader', { name: new RegExp(title, 'i') })
  return cell.closest('tr')
}

describe('Posts', () => {
  it('lists drafts alongside published posts', async () => {
    await renderAs(ROLE.content, <App />, { route: '/posts' })

    expect(await rowFor('first datathon')).toBeInTheDocument()
    expect(await rowFor('spring speaker series')).toBeInTheDocument()
  })

  it('lets a publisher take a post down', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.content, <App />, { route: '/posts' })

    const row = await rowFor('first datathon')
    expect(within(row).getByText('published')).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: /unpublish/i }))

    const updated = await rowFor('first datathon')
    expect(await within(updated).findByText('draft')).toBeInTheDocument()
  })

  it('offers no publish control to a role that cannot publish', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/posts' })

    const row = await rowFor('first datathon')
    expect(within(row).queryByRole('button', { name: /unpublish/i })).not.toBeInTheDocument()
    expect(within(row).getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })
})

describe('PostEditor', () => {
  it('derives the slug from the title until it is edited by hand', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.writer, <App />, { route: '/posts/new' })

    await user.type(await screen.findByLabelText(/title/i), 'Spring Workshop Series!')
    expect(screen.getByLabelText(/slug/i)).toHaveValue('spring-workshop-series')

    await user.clear(screen.getByLabelText(/slug/i))
    await user.type(screen.getByLabelText(/slug/i), 'custom-slug')
    await user.type(screen.getByLabelText(/title/i), ' 2027')

    expect(screen.getByLabelText(/slug/i)).toHaveValue('custom-slug')
  })

  it('creates a draft and keeps it unpublished', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.writer, <App />, { route: '/posts/new' })

    await user.type(await screen.findByLabelText(/title/i), 'A new post')
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    await screen.findByText(/^saved\.$/i)

    const posts = await client.posts.list()
    const created = posts.find((p) => p.title === 'A new post')
    expect(created.status).toBe('draft')
  })

  it('tells a writer why they cannot publish', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/posts/post-3' })

    expect(await screen.findByText(/needs a role with publish rights/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^publish$/i })).not.toBeInTheDocument()
  })

  it('rejects a slug that is already taken', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.content, <App />, { route: '/posts/new' })

    await user.type(await screen.findByLabelText(/title/i), 'Datathon 2026 recap')
    await user.click(screen.getByRole('button', { name: /create draft/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i)
  })

  it('previews the markdown as the site will render it', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.content, <App />, { route: '/posts/post-1' })

    await user.click(await screen.findByRole('button', { name: /preview/i }))

    expect(screen.getByRole('heading', { name: /the format/i })).toBeInTheDocument()
  })
})
