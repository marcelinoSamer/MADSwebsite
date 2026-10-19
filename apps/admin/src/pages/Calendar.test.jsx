import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

/** Everything listed, upcoming and past — which half depends on today. */
const allRows = () =>
  ['Upcoming', 'Past'].flatMap((name) =>
    within(screen.getByRole('region', { name })).queryAllByRole('listitem'),
  )

describe('Calendar', () => {
  it('lists every event, members-only ones marked', async () => {
    await renderAs(ROLE.events, <App />, { route: '/calendar' })

    const meeting = (await screen.findByRole('heading', { name: /board meeting/i })).closest('li')
    expect(within(meeting).getByText(/members only/i)).toBeInTheDocument()
    expect(allRows()).toHaveLength(4)
  })

  it('adds an event', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.events, <App />, { route: '/calendar' })

    await user.type(await screen.findByLabelText('Title', { selector: '#event-new-title' }), 'Study night')
    await user.type(screen.getByLabelText('Date', { selector: '#event-new-date' }), '2030-12-01')
    await user.type(screen.getByLabelText(/starts/i, { selector: '#event-new-startTime' }), '18:00')
    await user.click(screen.getByRole('button', { name: /add event/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/study night is on the calendar/i)
    const stored = (await client.events.list()).find((e) => e.title === 'Study night')
    expect(stored).toMatchObject({ date: '2030-12-01', startTime: '18:00', endTime: null, isPublic: true })
    expect(await screen.findByRole('heading', { name: 'Study night' })).toBeInTheDocument()
  })

  it('edits an event in place', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.events, <App />, { route: '/calendar' })

    await user.click(await screen.findByRole('button', { name: /edit datathon/i }))
    const title = screen.getByLabelText('Title', { selector: '#event-event-4-title' })
    await user.clear(title)
    await user.type(title, 'Spring datathon')
    await user.click(screen.getByRole('button', { name: /save event/i }))

    expect(await screen.findByRole('heading', { name: 'Spring datathon' })).toBeInTheDocument()
    expect((await client.events.byId('event-4')).title).toBe('Spring datathon')
  })

  it('refuses an event that ends before it starts, keeping what was typed', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.events, <App />, { route: '/calendar' })

    await user.type(await screen.findByLabelText('Title', { selector: '#event-new-title' }), 'Backwards')
    await user.type(screen.getByLabelText('Date', { selector: '#event-new-date' }), '2030-12-02')
    await user.type(screen.getByLabelText(/last day/i, { selector: '#event-new-endDate' }), '2030-12-01')
    await user.click(screen.getByRole('button', { name: /add event/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot end before it starts/i)
    expect(screen.getByLabelText('Title', { selector: '#event-new-title' })).toHaveValue('Backwards')
  })

  it('removes an event only after the button is armed', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.events, <App />, { route: '/calendar' })

    await user.click(await screen.findByRole('button', { name: /remove board meeting/i }))
    expect((await client.events.list()).some((e) => e.id === 'event-3')).toBe(true)
    await user.click(screen.getByRole('button', { name: /delete for good/i }))

    expect((await client.events.list()).some((e) => e.id === 'event-3')).toBe(false)
  })

  it('is closed to a role without calendar access', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/calendar' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
  })
})
