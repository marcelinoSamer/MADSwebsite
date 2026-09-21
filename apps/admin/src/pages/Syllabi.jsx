import { useRef, useState } from 'react'
import { useQuery, useAction } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'

const TERMS = ['Fall', 'Spring', 'Summer']
const THIS_YEAR = new Date().getFullYear()

function UploadForm({ courses, onDone }) {
  const fileInput = useRef(null)
  const [courseId, setCourseId] = useState('')
  const [term, setTerm] = useState('Fall')
  const [year, setYear] = useState(String(THIS_YEAR))
  const [file, setFile] = useState(null)
  const fileName = file?.name ?? ''

  const upload = useAction((client, input) => client.syllabi.create(input))

  async function handleSubmit(event) {
    event.preventDefault()
    // The File itself goes to the adapter: Supabase uploads the bytes to
    // Storage before inserting the row, while the mock keeps the name only.
    // On failure the form stays filled in so it can be retried without
    // re-picking the file; `upload.error` renders below.
    if (!(await upload.run({ courseId, term, year, fileName, file })).ok) return

    setFile(null)
    if (fileInput.current) fileInput.current.value = ''
    onDone()
  }

  // Validation is in JS rather than native, matching the other forms in the
  // app: the submit button stays disabled until the required choices are
  // made, and the adapter is the backstop.
  return (
    <form className="panel form-inline" onSubmit={handleSubmit} noValidate>
      <h2>Add a syllabus</h2>

      <div className="form-field">
        <label htmlFor="course">Course</label>
        <select
          id="course"
          className="field"
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          required
        >
          <option value="">Choose a course…</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="term">Term</label>
        <select id="term" className="field" value={term} onChange={(e) => setTerm(e.target.value)}>
          {TERMS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="year">Year</label>
        <input
          id="year"
          className="field"
          type="number"
          min="2000"
          max={THIS_YEAR + 1}
          value={year}
          onChange={(event) => setYear(event.target.value)}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="file">PDF</label>
        {/* The mock records the filename only. The Supabase adapter will send
            the bytes to Storage first and keep the returned path — the row
            shape does not change. */}
        <input
          id="file"
          ref={fileInput}
          className="field"
          type="file"
          accept="application/pdf"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>

      {upload.error && <p className="state state-error" role="alert">{upload.error.message}</p>}

      <button
        type="submit"
        className="btn btn-solid"
        disabled={upload.pending || !fileName || !courseId}
      >
        {upload.pending ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  )
}

function Archive() {
  const courses = useQuery((c) => c.courses.list())
  const syllabi = useQuery((c) => c.syllabi.list())
  const remove = useAction((client, id) => client.syllabi.remove(id))

  async function handleRemove(id) {
    if ((await remove.run(id)).ok) syllabi.refetch()
  }

  const byCourse = (courseId) => syllabi.data?.filter((s) => s.courseId === courseId) ?? []

  return (
    <>
      <PageTitle
        title="Syllabi"
        lead="Uploaded files are public — anyone with the link can read them."
      />

      <AsyncState loading={courses.loading || syllabi.loading} error={courses.error || syllabi.error}>
        {courses.data && (
          <UploadForm courses={courses.data} onDone={() => syllabi.refetch()} />
        )}

        {remove.error && <p className="state state-error" role="alert">{remove.error.message}</p>}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">On file</th>
              </tr>
            </thead>
            <tbody>
              {courses.data?.map((course) => (
                <tr key={course.id}>
                  <th scope="row">
                    {course.code}
                    <span className="micro row-sub">{course.title}</span>
                  </th>
                  <td>
                    {byCourse(course.id).length === 0 ? (
                      <span className="cell-muted">Nothing yet</span>
                    ) : (
                      <ul className="chip-list">
                        {byCourse(course.id).map((file) => (
                          <li key={file.id} className="chip">
                            <span>{file.term} {file.year}</span>
                            <button
                              type="button"
                              className="chip-remove"
                              onClick={() => handleRemove(file.id)}
                              aria-label={`Remove ${course.code} ${file.term} ${file.year}`}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </>
  )
}

function Syllabi() {
  return (
    <Gate need={[PERMISSIONS.SYLLABI_WRITE]}>
      <Archive />
    </Gate>
  )
}

export default Syllabi
