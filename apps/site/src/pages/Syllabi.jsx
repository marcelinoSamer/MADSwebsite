import { useMemo, useState } from 'react'
import { useData, useQuery } from '@mads/db/react'
import PageHead from '../components/PageHead'
import AsyncState from '../components/AsyncState'
import Reveal from '../components/Reveal'

function Syllabi() {
  const client = useData()
  const courses = useQuery((c) => c.courses.list())
  const syllabi = useQuery((c) => c.syllabi.list())
  const [query, setQuery] = useState('')

  const loading = courses.loading || syllabi.loading
  const error = courses.error || syllabi.error

  // One row per course, with its syllabi nested — the archive is browsed by
  // course, never by file.
  const rows = useMemo(() => {
    if (!courses.data || !syllabi.data) return []
    const term = query.trim().toLowerCase()

    return courses.data
      .map((course) => ({
        ...course,
        files: syllabi.data.filter((s) => s.courseId === course.id),
      }))
      .filter((course) =>
        term
          ? `${course.code} ${course.title} ${course.level}`.toLowerCase().includes(term)
          : true,
      )
  }, [courses.data, syllabi.data, query])

  return (
    <>
      <PageHead
        mark="§ 06"
        eyebrow="Archive"
        title="Course syllabi, in one place."
        lead="Collected by the academics committee so nobody has to ask around the week before registration."
      >
        <Reveal className="filter-bar" delay={0.16}>
          <label className="micro" htmlFor="syllabus-search">Search by course</label>
          <input
            id="syllabus-search"
            type="search"
            className="field"
            placeholder="MACT 2123, probability, junior…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
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
                : 'The archive is empty. Syllabi are added each term.'
            }
          >
            <div className="course-list">
              {rows.map((course, i) => (
                <Reveal key={course.id} className="course-row" delay={Math.min(i, 6) * 0.05} y={18}>
                  <div className="course-id">
                    <span className="course-code">{course.code}</span>
                    {course.level && <span className="micro course-level">{course.level}</span>}
                  </div>

                  <div className="course-body">
                    <h2>{course.title}</h2>
                    {course.files.length === 0 ? (
                      <p className="micro course-none">No syllabus on file yet.</p>
                    ) : (
                      <ul className="syllabus-files">
                        {course.files.map((file) => (
                          <li key={file.id}>
                            <a
                              href={client.syllabi.publicUrl(file.filePath)}
                              className="syllabus-link"
                              download={file.fileName}
                            >
                              {file.term} {file.year}
                              <span className="micro"> — {file.fileName}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
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
