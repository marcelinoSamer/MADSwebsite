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

  it('removes a file from the archive', async () => {
    const user = userEvent.setup()
    const { client } = await renderAs(ROLE.academics, <App />, { route: '/syllabi' })

    await user.click(
      await screen.findByRole('button', { name: /remove MACT 2123 Fall 2026/i }),
    )

    expect(await client.syllabi.list({ courseId: 'course-1' })).toHaveLength(0)
  })
})
