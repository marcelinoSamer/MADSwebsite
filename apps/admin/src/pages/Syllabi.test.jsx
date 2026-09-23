import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import App from '../App'
import { renderAs, ROLE } from '../test/renderWithProviders'

describe('Syllabi', () => {
  it('shows which courses have nothing on file', async () => {
    await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    const row = (await screen.findByRole('rowheader', { name: /MACT 3231/i })).closest('tr')
    expect(within(row).getByText(/nothing yet/i)).toBeInTheDocument()
  })

  it('warns that uploads are public', async () => {
    await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    expect(await screen.findByText(/uploaded files are public/i)).toBeInTheDocument()
  })

  it('attaches an uploaded file to the chosen course and term', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.selectOptions(await screen.findByLabelText(/course/i), 'course-3')
    await user.selectOptions(screen.getByLabelText(/term/i), 'Spring')
    await user.clear(screen.getByLabelText(/year/i))
    await user.type(screen.getByLabelText(/year/i), '2027')
    await user.upload(
      screen.getByLabelText(/pdf/i),
      new File(['%PDF-'], 'MACT3231-Spring2027.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: /upload/i }))

    const stored = await client.syllabi.list({ courseId: 'course-3' })
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ term: 'Spring', year: 2027 })
  })

  it('refuses a second file for a term a course already has', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.selectOptions(await screen.findByLabelText(/^course$/i), 'course-1')
    await user.clear(screen.getByLabelText(/year/i))
    await user.type(screen.getByLabelText(/year/i), '2026')
    await user.upload(
      screen.getByLabelText(/pdf/i),
      new File(['%PDF-'], 'MACT2123-again.pdf', { type: 'application/pdf' }),
    )
    await user.click(screen.getByRole('button', { name: /upload/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already has a fall 2026/i)
    expect(await client.syllabi.list({ courseId: 'course-1' })).toHaveLength(1)
  })

  it('removes a file from the archive', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.click(
      await screen.findByRole('button', { name: /remove MACT 2123 Fall 2026/i }),
    )

    expect(await client.syllabi.list({ courseId: 'course-1' })).toHaveLength(0)
  })

  it('adds a course to the catalogue', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.type(await screen.findByLabelText(/code/i), 'MACT 4241')
    await user.type(screen.getByLabelText(/title/i), 'Survival Models')
    await user.type(screen.getByLabelText(/level/i), 'Senior')
    await user.click(screen.getByRole('button', { name: /add course/i }))

    const stored = await client.courses.list()
    expect(stored.find((c) => c.code === 'MACT 4241')).toMatchObject({
      title: 'Survival Models',
      level: 'Senior',
    })
  })

  it('will not add a course code that is already in the catalogue', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.type(await screen.findByLabelText(/code/i), 'MACT 2123')
    await user.type(screen.getByLabelText(/title/i), 'Probability Theory')
    await user.click(screen.getByRole('button', { name: /add course/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/already in the catalogue/i)
    expect(await client.courses.list()).toHaveLength(5)
  })

  it('asks before removing a course, then removes it', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    // MACT 3231 has no files, so nothing goes with it.
    await user.click(
      await screen.findByRole('button', { name: /remove MACT 3231 from the catalogue/i }),
    )
    expect(screen.getByText(/delete MACT 3231\?/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /yes, delete/i }))

    const stored = await client.courses.list()
    expect(stored.map((c) => c.code)).not.toContain('MACT 3231')
  })

  it('keeps the course when the confirmation is declined', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.click(
      await screen.findByRole('button', { name: /remove MACT 3231 from the catalogue/i }),
    )
    await user.click(screen.getByRole('button', { name: /keep/i }))

    expect(screen.queryByRole('button', { name: /yes, delete/i })).not.toBeInTheDocument()
    expect((await client.courses.list()).map((c) => c.code)).toContain('MACT 3231')
  })

  it('clears a course’s syllabi with it, which the foreign key would refuse', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    // MACT 3223 has two files on it.
    await user.click(
      await screen.findByRole('button', { name: /remove MACT 3223 from the catalogue/i }),
    )
    expect(screen.getByText(/and its 2 file/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /yes, delete/i }))

    expect((await client.courses.list()).map((c) => c.code)).not.toContain('MACT 3223')
    expect(await client.syllabi.list({ courseId: 'course-2' })).toHaveLength(0)
  })
})
