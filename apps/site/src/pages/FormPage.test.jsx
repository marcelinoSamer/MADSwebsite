import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { Route, Routes } from 'react-router'
import { createMockAdapter, createSeed, DEV_PASSWORD } from '@mads/db'
import FormPage from './FormPage'
import { renderWithProviders } from '../test/renderWithProviders'

const renderAt = (slug, options) =>
  renderWithProviders(
    <Routes>
      <Route path="/forms/:slug" element={<FormPage />} />
    </Routes>,
    { route: `/forms/${slug}`, ...options },
  )

describe('FormPage', () => {
  it('builds the fields from the stored form definition', async () => {
    renderAt('feedback')

    expect(await screen.findByRole('combobox', { name: /what is this about/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /your feedback/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
  })

  it('marks an optional field as optional', async () => {
    renderAt('feedback')
    expect(await screen.findByText('optional')).toBeInTheDocument()
  })

  it('stores a submission and confirms it', async () => {
    const user = userEvent.setup()
    const { client } = renderAt('feedback')

    await user.selectOptions(
      await screen.findByRole('combobox', { name: /what is this about/i }),
      'Workshops',
    )
    await user.type(screen.getByRole('textbox', { name: /your feedback/i }), 'Loved the R session.')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText(/that reached us/i)).toBeInTheDocument()

    await client.auth.signIn({ email: 'mads@aucegypt.edu', password: 'mads' })
    const stored = await client.submissions.list()
    expect(stored[0].payload.message).toBe('Loved the R session.')
  })

  it('surfaces a missing required field instead of failing silently', async () => {
    const user = userEvent.setup()
    renderAt('feedback')

    await screen.findByRole('button', { name: /send/i })
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/please fill in/i)
  })

  it('does not expose an internal form to the public site', async () => {
    renderAt('event-proposal')

    expect(await screen.findByText(/for committee members/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /event title/i })).not.toBeInTheDocument()
  })

  it('draws multiple choice, checkboxes and a scale, and stores what was picked', async () => {
    const user = userEvent.setup()
    const seed = createSeed()
    seed.forms.push({
      id: 'form-x',
      slug: 'poll',
      title: 'Poll',
      description: '',
      audience: 'public',
      isOpen: true,
      fields: [
        { id: 'q1', name: 'day', label: 'Which day?', type: 'radio', required: true, options: ['Monday', 'Thursday'], help: 'Evenings only.' },
        { id: 'q2', name: 'topics', label: 'Topics', type: 'checkbox', required: false, options: ['R', 'Python'] },
        { id: 'q3', name: 'useful', label: 'How useful?', type: 'scale', required: true, scaleMin: 0, scaleMax: 3, minLabel: 'Not at all' },
      ],
      createdAt: '2026-09-01T09:00:00.000Z',
    })
    const client = createMockAdapter({ seed })
    renderAt('poll', { client })

    expect(await screen.findByRole('group', { name: /which day/i })).toHaveAccessibleDescription('Evenings only.')
    expect(screen.getByText('Not at all')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Monday' }))
    await user.click(screen.getByRole('checkbox', { name: 'Python' }))
    await user.click(screen.getByRole('radio', { name: '0' }))
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/that reached us/i)
    await client.auth.signIn({ email: 'mads@aucegypt.edu', password: DEV_PASSWORD })
    const [answer] = await client.submissions.list('form-x')
    expect(answer.payload).toEqual({ day: 'Monday', topics: ['Python'], useful: '0' })
  })
})
