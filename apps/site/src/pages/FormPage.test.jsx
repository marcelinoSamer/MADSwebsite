import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { Route, Routes } from 'react-router'
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
})
