import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

// Scoped to the builder's own list — the shell's nav is a list of items too.
const questions = () =>
  within(screen.getByRole('list', { name: /questions/i })).getAllByRole('listitem')

describe('FormEditor', () => {
  it('creates an internal form by default, with the questions that were added', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms/new' })

    await user.type(await screen.findByLabelText(/^title$/i), 'Equipment loan')
    await user.click(screen.getByRole('button', { name: /add question/i }))
    await user.type(screen.getByLabelText(/^question$/i), 'What do you need?')
    await user.click(screen.getByLabelText(/^required$/i))
    await user.click(screen.getByRole('button', { name: /create form/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i)

    const form = await client.forms.bySlug('equipment-loan')
    expect(form.audience).toBe('internal')
    expect(form.fields).toEqual([
      expect.objectContaining({
        label: 'What do you need?',
        // The name follows the label, so nobody has to invent a column key.
        name: 'what-do-you-need',
        type: 'text',
        required: true,
      }),
    ])
  })

  it('publishes a form to the site by switching its audience to public', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms/form-3/edit' })

    await user.click(await screen.findByLabelText(/public — anyone on the site/i))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByRole('status')
    expect((await client.forms.byId('form-3')).audience).toBe('public')
  })

  it('shows the public URL only once the form is public', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.president, <App />, { route: '/forms/form-3/edit' })

    expect(await screen.findByText(/internal forms have no public URL/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/public — anyone on the site/i))
    expect(screen.getByText('On the site at /forms/venue-reservation')).toBeInTheDocument()
  })

  it('reorders and removes questions', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms/form-3/edit' })

    await screen.findByDisplayValue('Which venue?')
    await user.click(within(questions()[1]).getByRole('button', { name: /move up/i }))
    await user.click(within(questions()[3]).getByRole('button', { name: /remove/i }))
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByRole('status')
    const form = await client.forms.byId('form-3')
    expect(form.fields.map((f) => f.name)).toEqual(['date', 'venue', 'attendees'])
  })

  it('keeps the draft on screen when the slug collides', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms/new' })

    await user.type(await screen.findByLabelText(/^title$/i), 'Feedback')
    await user.click(screen.getByRole('button', { name: /create form/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i)
    expect(screen.getByLabelText(/^title$/i)).toHaveValue('Feedback')
    expect(await client.forms.list()).toHaveLength(3)
  })

  it('refuses two questions that would share one answer key', async () => {
    const user = userEvent.setup()
    await renderAs(ROLE.president, <App />, { route: '/forms/new' })

    await user.type(await screen.findByLabelText(/^title$/i), 'Equipment loan')
    await user.click(screen.getByRole('button', { name: /add question/i }))
    await user.click(screen.getByRole('button', { name: /add question/i }))

    const [first, second] = questions()
    await user.type(within(first).getByLabelText(/^question$/i), 'Item')
    await user.type(within(second).getByLabelText(/^question$/i), 'Item')
    await user.click(screen.getByRole('button', { name: /create form/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/share the name/i)
  })

  it('is closed to a role without forms:write', async () => {
    await renderAs(ROLE.writer, <App />, { route: '/forms/form-3/edit' })

    expect(await screen.findByRole('heading', { name: /not your area/i })).toBeInTheDocument()
  })

  it('builds Google Forms style questions: multiple choice, checkboxes, a scale', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms/new' })

    await user.type(await screen.findByLabelText(/^title$/i), 'Workshop poll')

    await user.click(screen.getByRole('button', { name: /add question/i }))
    let [row] = questions()
    await user.type(within(row).getByLabelText(/^question$/i), 'Which day?')
    await user.selectOptions(within(row).getByLabelText(/answer type/i), 'radio')
    await user.type(within(row).getByLabelText(/^options$/i), 'Monday{enter}Thursday')

    await user.click(screen.getByRole('button', { name: /add question/i }))
    row = questions()[1]
    await user.type(within(row).getByLabelText(/^question$/i), 'Topics')
    await user.selectOptions(within(row).getByLabelText(/answer type/i), 'checkbox')
    await user.type(within(row).getByLabelText(/^options$/i), 'R{enter}Python')

    await user.click(screen.getByRole('button', { name: /add question/i }))
    row = questions()[2]
    await user.type(within(row).getByLabelText(/^question$/i), 'How useful?')
    await user.selectOptions(within(row).getByLabelText(/answer type/i), 'scale')
    await user.selectOptions(within(row).getByLabelText(/^to$/i), '10')
    await user.type(within(row).getByLabelText(/high label/i), 'Very')

    await user.click(screen.getByRole('button', { name: /create form/i }))
    await screen.findByRole('status')

    const form = await client.forms.bySlug('workshop-poll')
    expect(form.fields).toEqual([
      expect.objectContaining({ type: 'radio', options: ['Monday', 'Thursday'] }),
      expect.objectContaining({ type: 'checkbox', options: ['R', 'Python'] }),
      expect.objectContaining({ type: 'scale', scaleMin: 1, scaleMax: 10, maxLabel: 'Very' }),
    ])
  })

  it('deletes a form and its responses after the button is armed', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.president, <App />, { route: '/forms/form-1/edit' })

    await user.click(await screen.findByRole('button', { name: /^delete$/i }))
    await user.click(screen.getByRole('button', { name: /delete form and its responses/i }))

    expect(await screen.findByRole('heading', { name: /^forms$/i })).toBeInTheDocument()
    expect((await client.forms.list()).some((f) => f.id === 'form-1')).toBe(false)
    expect(await client.submissions.list('form-1')).toEqual([])
  })
})
