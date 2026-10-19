import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useCan } from '@mads/db/react'
import { PERMISSIONS, CHOICE_TYPES, SCALE_LIMITS, answerText, isBlank } from '@mads/db'
import PageTitle from '../components/PageTitle'
import AsyncState from '../components/AsyncState'
import Gate from '../components/Gate'
import { formatDateTime } from '../lib/format'
import { downloadCsv } from '../lib/csv'

/** The choices a summary counts over — a scale's points, or a choice's options. */
function choicesFor(field) {
  if (field.type === 'scale') {
    const min = Number(field.scaleMin ?? SCALE_LIMITS.defaultMin)
    const max = Number(field.scaleMax ?? SCALE_LIMITS.defaultMax)
    return Array.from({ length: max - min + 1 }, (_, i) => String(min + i))
  }
  return field.options ?? []
}

/**
 * One question's answers, the way Google Forms' summary tab shows them: a bar
 * per option for anything chosen from a list, the answers themselves for
 * anything typed. An option removed from the form after people picked it
 * still gets a bar — the answer is real even if the option is gone.
 */
function QuestionSummary({ field, submissions }) {
  const answers = submissions.map((s) => s.payload[field.name]).filter((a) => !isBlank(a))
  const counted = CHOICE_TYPES.includes(field.type) || field.type === 'scale'

  let body
  if (counted) {
    const tally = new Map(choicesFor(field).map((choice) => [choice, 0]))
    for (const answer of answers) {
      for (const choice of Array.isArray(answer) ? answer : [String(answer)]) {
        tally.set(choice, (tally.get(choice) ?? 0) + 1)
      }
    }
    body = (
      <ul className="bars">
        {[...tally].map(([choice, count]) => {
          const share = answers.length ? Math.round((count / answers.length) * 100) : 0
          return (
            <li key={choice} className="bar">
              <span>{choice}</span>
              <span className="bar-track" aria-hidden="true">
                <span className="bar-fill" style={{ width: `${share}%` }} />
              </span>
              <span className="bar-count">
                {count} · {share}%
              </span>
            </li>
          )
        })}
      </ul>
    )
  } else {
    body = answers.length ? (
      <ul className="answer-list">
        {answers.map((answer, index) => (
          <li key={index}>{answerText(answer)}</li>
        ))}
      </ul>
    ) : null
  }

  return (
    <section className="panel summary-item" aria-label={field.label}>
      <h3>{field.label}</h3>
      <span className="micro">
        {answers.length} answer{answers.length === 1 ? '' : 's'}
        {field.type === 'checkbox' && ' · more than one can be ticked'}
      </span>
      {body}
    </section>
  )
}

function ResponseTable({ fields, submissions }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">When</th>
            {fields.map((field) => (
              <th key={field.id} scope="col">{field.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id}>
              <th scope="row" className="cell-muted cell-nowrap">
                {formatDateTime(submission.createdAt)}
              </th>
              {fields.map((field) => (
                <td key={field.id} className="cell-long">
                  {answerText(submission.payload[field.name]) || <span className="cell-muted">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'table', label: 'Individual responses' },
]

function Responses() {
  const { id } = useParams()
  const form = useQuery((c) => c.forms.byId(id), [id])
  const submissions = useQuery((c) => c.submissions.list(id), [id])
  const canEdit = useCan(PERMISSIONS.FORMS_WRITE)
  const [tab, setTab] = useState('summary')

  // Columns come from the form definition, not from the first row — a field
  // added later would otherwise silently disappear from the table.
  const fields = form.data?.fields ?? []
  const count = submissions.data?.length ?? 0

  function exportCsv() {
    downloadCsv(`${form.data?.slug ?? 'form'}-responses-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['submitted', ...fields.map((field) => field.label)],
      ...(submissions.data ?? []).map((s) => [
        s.createdAt,
        ...fields.map((field) => answerText(s.payload[field.name])),
      ]),
    ])
  }

  return (
    <>
      <PageTitle
        title={form.data ? form.data.title : 'Responses'}
        lead={`${count} response${count === 1 ? '' : 's'}${form.data && !form.data.isOpen ? ' · closed to new ones' : ''}.`}
      >
        <Link className="btn btn-quiet" to="/forms">Back to forms</Link>
        {canEdit && <Link className="btn btn-quiet" to={`/forms/${id}/edit`}>Edit form</Link>}
        <button type="button" className="btn btn-quiet" onClick={exportCsv} disabled={!count}>
          Export CSV
        </button>
      </PageTitle>

      <AsyncState
        loading={form.loading || submissions.loading}
        error={form.error || submissions.error}
        isEmpty={count === 0}
        empty="Nobody has filled this in yet."
      >
        <div className="tabs" role="tablist" aria-label="Response views">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'summary' ? (
            <div className="summary-list">
              {fields.map((field) => (
                <QuestionSummary key={field.id} field={field} submissions={submissions.data ?? []} />
              ))}
            </div>
          ) : (
            <ResponseTable fields={fields} submissions={submissions.data ?? []} />
          )}
        </div>
      </AsyncState>
    </>
  )
}

function Submissions() {
  return (
    <Gate need={[PERMISSIONS.SUBMISSIONS_READ]}>
      <Responses />
    </Gate>
  )
}

export default Submissions
