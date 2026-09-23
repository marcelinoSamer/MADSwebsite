import { useId, useRef, useState } from 'react'
import { useQuery, useAction } from '@mads/db/react'
import { PERMISSIONS } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'

const TERMS = ['Fall', 'Spring', 'Summer']
const THIS_YEAR = new Date().getFullYear()

/**
 * Suggestions, not a fixed list.
 *
 * `level` is free text in the database on purpose — a board that starts
 * tagging graduate courses should get a new filter on the public archive
 * without a migration — so this is a datalist the field offers rather than a
 * select that forbids anything else.
 */
const LEVELS = ['Freshman', 'Sophomore', 'Junior', 'Senior']

/** Add a course to the catalogue. Nothing can be uploaded until one exists. */
function CourseForm({ onDone }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('')
  const levelListId = useId()

  const add = useAction((client, input) => client.courses.create(input))

  async function handleSubmit(event) {
    event.preventDefault()
    if (!(await add.run({ code, title, level })).ok) return

    setCode('')
    setTitle('')
    setLevel('')
    onDone()
  }

  return (
    <form className="panel form-inline" onSubmit={handleSubmit} noValidate>
      <h2>Add a course</h2>

      <div className="form-field">
        <label htmlFor="course-code">Code</label>
        <input
          id="course-code"
          className="field"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="MACT 2123"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="course-title">Title</label>
        <input
          id="course-title"
          className="field"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Probability Theory"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="course-level">Level</label>
        <input
          id="course-level"
          className="field"
          list={levelListId}
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          placeholder="Sophomore"
        />
        <datalist id={levelListId}>
          {LEVELS.map((option) => <option key={option} value={option} />)}
        </datalist>
      </div>

      {add.error && <p className="state state-error" role="alert">{add.error.message}</p>}

      <button
        type="submit"
        className="btn btn-solid"
        disabled={add.pending || !code.trim() || !title.trim()}
      >
        {add.pending ? 'Adding…' : 'Add course'}
      </button>
    </form>
  )
}

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

  const removeFile = useAction((client, id) => client.syllabi.remove(id))
  const removeCourse = useAction((client, id) => client.courses.remove(id))

  // Which course's delete is awaiting a yes. Confirming inline rather than
  // through window.confirm keeps the count of files about to go with it on
  // screen while the decision is made.
  const [confirming, setConfirming] = useState(null)

  const byCourse = (courseId) => syllabi.data?.filter((s) => s.courseId === courseId) ?? []

  async function handleRemoveFile(id) {
    if ((await removeFile.run(id)).ok) syllabi.refetch()
  }

  /**
   * Delete a course, and its files first if it has any.
   *
   * The foreign key is `on delete restrict`, so the database refuses a course
   * that still has syllabi — deliberately, to stop a mis-click binning an
   * archive. Clearing the files here is that same refusal answered out loud:
   * the confirmation names the count, and each file is removed by the normal
   * call, which takes its bytes out of Storage with it.
   */
  async function handleRemoveCourse(course) {
    for (const file of byCourse(course.id)) {
      if (!(await removeFile.run(file.id)).ok) {
        syllabi.refetch()
        return
      }
    }
    if ((await removeCourse.run(course.id)).ok) {
      setConfirming(null)
      courses.refetch()
    }
    syllabi.refetch()
  }

  const error = removeFile.error || removeCourse.error

  return (
    <>
      <PageTitle
        title="Syllabi"
        lead="The course catalogue behind the public archive. Uploaded files are public — anyone with the link can read them."
      />

      <AsyncState loading={courses.loading || syllabi.loading} error={courses.error || syllabi.error}>
        <div className="panel-row">
          <CourseForm onDone={() => courses.refetch()} />
          {courses.data && (
            <UploadForm courses={courses.data} onDone={() => syllabi.refetch()} />
          )}
        </div>

        {error && <p className="state state-error" role="alert">{error.message}</p>}

        {courses.data?.length === 0 ? (
          <p className="state state-note">
            No courses yet. Add one above — a syllabus is filed against a course.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Level</th>
                  <th scope="col">On file</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {courses.data?.map((course) => (
                  <tr key={course.id}>
                    <th scope="row">
                      {course.code}
                      <span className="micro row-sub">{course.title}</span>
                    </th>
                    <td className="cell-nowrap">
                      {course.level || <span className="cell-muted">—</span>}
                    </td>
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
                                onClick={() => handleRemoveFile(file.id)}
                                aria-label={`Remove ${course.code} ${file.term} ${file.year}`}
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="cell-actions">
                      {confirming === course.id ? (
                        <>
                          <span className="cell-muted">
                            {byCourse(course.id).length > 0
                              ? `Delete ${course.code} and its ${byCourse(course.id).length} file(s)?`
                              : `Delete ${course.code}?`}
                          </span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={removeCourse.pending || removeFile.pending}
                            onClick={() => handleRemoveCourse(course)}
                          >
                            Yes, delete
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet"
                            onClick={() => setConfirming(null)}
                          >
                            Keep
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-quiet"
                          onClick={() => setConfirming(course.id)}
                          // Every row's button reads "Remove"; the accessible
                          // name has to say which one, and must not contain
                          // the word the Course select is labelled with.
                          aria-label={`Remove ${course.code} from the catalogue`}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
