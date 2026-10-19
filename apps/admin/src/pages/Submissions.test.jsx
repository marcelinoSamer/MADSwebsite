import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { createMockAdapter, withMember, DEV_PASSWORD } from '@mads/db'
import App from '../App'
import { renderAs, renderWithProviders, ROLE } from '../test/renderWithProviders'

/** Open the per-response table; the page opens on the summary. */
async function showTable(user) {
  await user.click(await screen.findByRole('tab', { name: /individual responses/i }))
}

describe('Submissions', () => {
  it('opens on a summary that counts each option', async () => {
    await renderAs(ROLE.president, <App />, { route: '/forms/form-1/submissions' })

    const topic = await screen.findByRole('region', { name: /what is this about/i })
    expect(within(topic).getByText('Workshops').closest('li')).toHaveTextContent('1 · 50%')
    expect(within(topic).getByText('The website').closest('li')).toHaveTextContent('0 · 0%')

    const feedback = screen.getByRole('region', { name: /your feedback/i })
    expect(within(feedback).getByText(/moved too fast for beginners/i)).toBeInTheDocument()
  })

  it('counts every box ticked on a checkbox question', async () => {
    const seed = withMember('role-academics')
    seed.forms.push({
      id: 'form-x',
      slug: 'interests',
      title: 'Interests',
      description: '',
      audience: 'internal',
      isOpen: true,
      fields: [{ id: 'q1', name: 'topics', label: 'Topics', type: 'checkbox', required: true, options: ['R', 'Python', 'SQL'] }],
      createdAt: '2026-09-01T09:00:00.000Z',
    })
    seed.submissions.push(
      { id: 'x1', formId: 'form-x', payload: { topics: ['R', 'Python'] }, submittedBy: null, createdAt: '2026-09-02T09:00:00.000Z' },
      { id: 'x2', formId: 'form-x', payload: { topics: ['Python'] }, submittedBy: null, createdAt: '2026-09-03T09:00:00.000Z' },
    )
    const client = createMockAdapter({ seed })
    await client.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })
    renderWithProviders(<App />, { client, route: '/forms/form-x/submissions' })

    const topics = await screen.findByRole('region', { name: 'Topics' })
    expect(within(topics).getByText('Python').closest('li')).toHaveTextContent('2 · 100%')
    expect(within(topics).getByText('R').closest('li')).toHaveTextContent('1 · 50%')

    const user = userEvent.setup()
    await showTable(user)
    expect(screen.getByText('R, Python')).toBeInTheDocument()
  })

  it('builds columns from the form definition and shows the responses', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.president, <App />, { route: '/forms/form-1/submissions' })
    await showTable(user)

    expect(await screen.findByRole('columnheader', { name: /your feedback/i })).toBeInTheDocument()
    expect(screen.getByText(/moved too fast for beginners/i)).toBeInTheDocument()
  })

  it('shows a placeholder where an optional field was left blank', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.president, <App />, { route: '/forms/form-1/submissions' })
    await showTable(user)

    const row = (await screen.findByText(/more evening events/i)).closest('tr')
    expect(within(row).getByText('—')).toBeInTheDocument()
  })

  it('is closed to a role that cannot read submissions', async () => {
    await renderAs(ROLE.content, <App />, { route: '/forms/form-1/submissions' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
  })
})
