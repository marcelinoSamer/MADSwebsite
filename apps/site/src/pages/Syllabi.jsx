import { useMemo, useState } from 'react'
import { useData, useQuery } from '@mads/db/react'
import PageHead from '../components/PageHead'
import AsyncState from '../components/AsyncState'
import Reveal from '../components/Reveal'

/**
 * Year levels in the order a degree is read in, not alphabetically.
 *
 * The list is derived from the courses actually in the archive — `level` is
 * free text on purpose, so a board that starts tagging graduate courses gets
 * a new filter without a migration. Anything unrecognised sorts after these,
 * alphabetically.
 */
const LEVEL_ORDER = ['Freshman', 'Sophomore', 'Junior', 'Senior']

function levelRank(level) {
  const i = LEVEL_ORDER.indexOf(level)
  return i === -1 ? LEVEL_ORDER.length : i
}

function Syllabi() {
  const client = useData()
  const courses = useQuery((c) => c.courses.list())
  const syllabi = useQuery((c) => c.syllabi.list())

  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('')
  const [onlyWithFiles, setOnlyWithFiles] = useState(false)

  const loading = courses.loading || syllabi.loading
  const error = courses.error || syllabi.error

  const levels = useMemo(() => {
    const found = [...new Set((courses.data ?? []).map((c) => c.level).filter(Boolean))]
    return found.sort((a, b) => levelRank(a) - levelRank(b) || a.localeCompare(b))
  }, [courses.data])

  // One row per course, with its syllabi nested — the archive is browsed by
  // course, never by file.
  const all = useMemo(() => {
    if (!courses.data || !syllabi.data) return []
    return courses.data.map((course) => ({
      ...course,
      files: syllabi.data.filter((s) => s.courseId === course.id),
    }))
  }, [courses.data, syllabi.data])

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase()
    return all.filter((course) => {
      if (level && course.level !== level) return false
      if (onlyWithFiles && course.files.length === 0) return false
      if (!term) return true
      return `${course.code} ${course.title} ${course.level}`.toLowerCase().includes(term)
    })
  }, [all, query, level, onlyWithFiles])

  const fileCount = rows.reduce((total, course) => total + course.files.length, 0)
  const filtered = Boolean(query || level || onlyWithFiles)

  function clearFilters() {
    setQuery('')
    setLevel('')
    setOnlyWithFiles(false)
  }

  return (
    <>
      <PageHead
        mark="§ 06"
        eyebrow="Archive"
        title="Course syllabi, in one place."
        lead="Collected by the academics committee so nobody has to ask around the week before registration."
      >
        {/* Search, level, and the has-a-file switch narrow the same list and
            so belong on one bar. Filtering is client-side: the catalogue is a
            few dozen courses, and a round trip per keystroke would be slower
            than the filter it replaces. */}
        <Reveal className="page-toolbar toolbar-filters" delay={0.16}>
          <div className="toolbar-search">
            <label className="micro" htmlFor="syllabus-search">Search by course</label>
            <input
              id="syllabus-search"
              type="search"
              className="field"
              placeholder="MACT 2123, probability, junior…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {levels.length > 0 && (
            <div className="toolbar-levels" role="group" aria-label="Filter by level">
              <button
                type="button"
                className="chip-toggle"
                aria-pressed={level === ''}
                onClick={() => setLevel('')}
              >
                All levels
              </button>
              {levels.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="chip-toggle"
                  aria-pressed={level === option}
                  onClick={() => setLevel(level === option ? '' : option)}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          <label className="toolbar-switch micro">
            <input
              type="checkbox"
              checked={onlyWithFiles}
              onChange={(event) => setOnlyWithFiles(event.target.checked)}
            />
            Only courses with a syllabus
          </label>
        </Reveal>
      </PageHead>

      <section className="section page-body">
        <div className="container">
          <AsyncState
            loading={loading}
            error={error}
            isEmpty={rows.length === 0}
            empty={
              query
                ? `No course matches “${query}”.`
                : filtered
                  ? 'No course matches those filters.'
                  : 'The archive is empty. Syllabi are added each term.'
            }
          >
            <div className="result-bar">
              <p className="result-count micro">
                {filtered ? `${rows.length} of ${all.length} courses` : `${rows.length} courses`}
                <span aria-hidden="true"> · </span>
                {fileCount} {fileCount === 1 ? 'syllabus' : 'syllabi'}
              </p>
              {filtered && (
                <button type="button" className="link-button micro" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>

            <div className="course-list">
              {rows.map((course, i) => (
                <Reveal
                  key={course.id}
                  as="article"
                  className="course-card"
                  delay={Math.min(i, 6) * 0.05}
                  y={16}
                >
                  <div className="course-card-head">
                    <div className="course-id">
                      <p className="course-code">{course.code}</p>
                      <h2>{course.title}</h2>
                    </div>
                    {course.level && <p className="course-level micro">{course.level}</p>}
                  </div>

                  {course.files.length === 0 ? (
                    <p className="micro course-none">No syllabus on file yet.</p>
                  ) : (
                    <ul className="syllabus-files">
                      {course.files.map((file) => (
                        <li key={file.id}>
                          {/* The term is the thing being chosen; the filename
                              is only there to confirm what lands in Downloads. */}
                          <a
                            href={client.syllabi.publicUrl(file.filePath)}
                            className="syllabus-link"
                            download={file.fileName}
                          >
                            <span className="syllabus-term">
                              {file.term} {file.year}
                            </span>
                            <span className="syllabus-file micro">PDF · {file.fileName}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </Reveal>
              ))}
            </div>
          </AsyncState>
        </div>
      </section>
    </>
  )
}

export default Syllabi
