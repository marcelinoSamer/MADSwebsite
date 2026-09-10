import { useState } from 'react'
import { JOIN_FORM_ENDPOINT } from '../config'

function JoinForm() {
  const [form, setForm] = useState({ name: '', email: '', major: '', year: '', why: '' })
  const [submitted, setSubmitted] = useState(false)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    // TODO: replace with a real request once the backend exists
    // fetch(JOIN_FORM_ENDPOINT, { method: 'POST', body: JSON.stringify(form) })
    console.log('Join form submitted (not yet connected to a backend):', form)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="section" id="join-form">
        <div className="container">
          <p className="eyebrow">Thank you</p>
          <h2>We've got your answer, {form.name.split(' ')[0] || 'friend'}.</h2>
          <p className="section-lead">We'll be in touch soon. Welcome to the equation.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section" id="join-form">
      <div className="container">
        <p className="eyebrow">Join MADS</p>
        <h2>Solve for a spot on the team.</h2>
        <form className="join-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">AUC email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="major">Major</label>
            <input id="major" name="major" type="text" value={form.major} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="year">Year</label>
            <select id="year" name="year" value={form.year} onChange={handleChange} required>
              <option value="">Select year</option>
              <option>Freshman</option>
              <option>Sophomore</option>
              <option>Junior</option>
              <option>Senior</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="why">Why do you want to join MADS?</label>
            <textarea id="why" name="why" rows="4" value={form.why} onChange={handleChange} required />
          </div>
          <button className="btn btn-primary" type="submit">Submit application</button>
        </form>
      </div>
    </section>
  )
}

export default JoinForm