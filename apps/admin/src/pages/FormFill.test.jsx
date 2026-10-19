import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { createMockAdapter, withMember, DEV_PASSWORD } from '@mads/db'
import App from '../App'
import { renderWithProviders, renderAs, ROLE } from '../test/renderWithProviders'

const VENUE = '/forms/form-3/fill'

async function fillVenueRequest(user) {
  await user.selectOptions(
    await screen.findByLabelText(/which venue/i),
    'Hatem Hall seminar room',
  )
  await user.type(screen.getByLabelText(/date needed/i), '2026-10-02')
  await user.type(screen.getByLabelText(/expected attendees/i), '30')
  await user.type(screen.getByLabelText(/what is it for/i), 'Study group kickoff.')
  await user.click(screen.getByRole('button', { name: /send/i }))
}

describe('FormFill', () => {
  // A Writer holds neither forms:write nor submissions:read. They can answer
  // and they cannot read the answers back, so the confirmation is all the
  // page can tell them — the stored row is asserted in the president case.
  it('accepts a response from a member without forms:write', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.writer, <App />, { route: VENUE })

    await fillVenueRequest(user)

    expect(await screen.findByRole('status')).toHaveTextContent(/sent/i)
  })

  it('lets the president fill one in too', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: VENUE })

    await fillVenueRequest(user)
    await screen.findByRole('status')

    const [latest] = await client.submissions.list('form-3')
    expect(latest.payload).toMatchObject({
      venue: 'Hatem Hall seminar room',
      attendees: '30',
      purpose: 'Study group kickoff.',
    })
  })

  it('refuses a submission missing a required answer, keeping the rest typed', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: VENUE })

    await user.type(await screen.findByLabelText(/what is it for/i), 'Study group kickoff.')
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/which venue/i)
    expect(screen.getByLabelText(/what is it for/i)).toHaveValue('Study group kickoff.')
    expect(await client.submissions.list('form-3')).toHaveLength(0)
  })

  it('starts a second response blank rather than pre-filled with the first', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.president, <App />, { route: VENUE })

    await fillVenueRequest(user)
    await user.click(await screen.findByRole('button', { name: /fill in another/i }))

    expect(await screen.findByLabelText(/what is it for/i)).toHaveValue('')
    expect(screen.getByLabelText(/which venue/i)).toHaveValue('')
  })

  it('says so when the form is closed instead of taking an answer', async () => {
    const seed = withMember(ROLE.writer)
    seed.forms.find((f) => f.slug === 'venue-reservation').isOpen = false
    const client = createMockAdapter({ seed })
    await client.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })

    renderWithProviders(<App />, { route: VENUE, client })

    expect(await screen.findByText(/closed and is not taking responses/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument()
  })

  it('stores ticked checkboxes as a list and a chosen option as one answer', async () => {
    const user = userEvent.setup()
    const seed = withMember('role-writer')
    seed.forms.push({
      id: 'form-x',
      slug: 'poll',
      title: 'Poll',
      description: '',
      audience: 'internal',
      isOpen: true,
      fields: [
        { id: 'q1', name: 'day', label: 'Which day?', type: 'radio', required: true, options: ['Monday', 'Thursday'] },
        { id: 'q2', name: 'topics', label: 'Topics', type: 'checkbox', required: true, options: ['R', 'Python', 'SQL'] },
        { id: 'q3', name: 'useful', label: 'How useful?', type: 'scale', required: false, scaleMin: 1, scaleMax: 5 },
      ],
      createdAt: '2026-09-01T09:00:00.000Z',
    })
    const client = createMockAdapter({ seed })
    renderWithProviders(<App />, { client, route: '/forms/form-x/fill' })
    // Sign in after rendering is what the panel does too; this one only needs
    // the president's reach to read the answer back.
    await client.auth.signIn({ email: 'mads@aucegypt.edu', password: DEV_PASSWORD })

    await user.click(await screen.findByLabelText('Thursday'))
    await user.click(screen.getByLabelText('R'))
    await user.click(screen.getByLabelText('SQL'))
    await user.click(screen.getByLabelText('4'))
    await user.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/sent/i)
    const [answer] = await client.submissions.list('form-x')
    expect(answer.payload).toEqual({ day: 'Thursday', topics: ['R', 'SQL'], useful: '4' })
  })

  it('refuses a required checkbox question left unticked', async () => {
    const user = userEvent.setup()
    const seed = withMember('role-writer')
    seed.forms.push({
      id: 'form-x',
      slug: 'poll',
      title: 'Poll',
      description: '',
      audience: 'internal',
      isOpen: true,
      fields: [{ id: 'q2', name: 'topics', label: 'Topics', type: 'checkbox', required: true, options: ['R', 'Python'] }],
      createdAt: '2026-09-01T09:00:00.000Z',
    })
    const client = createMockAdapter({ seed })
    await client.auth.signIn({ email: 'test@mads.auc', password: DEV_PASSWORD })
    renderWithProviders(<App />, { client, route: '/forms/form-x/fill' })

    await user.click(await screen.findByRole('button', { name: /send/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/please fill in: topics/i)
  })
})
