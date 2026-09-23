import Reveal from './Reveal'

/**
 * The semester calendar.
 *
 * PLACEHOLDER CONTENT — replace `SEMESTER` and every entry in `EVENTS` with
 * the real schedule. This list is hand-edited on purpose: there is no events
 * table in `packages/db` yet, so nothing in the admin panel writes here. If
 * the board ends up editing it more than a couple of times a semester, that
 * is the signal to give events a table and an admin page like posts have.
 *
 * Keep entries in date order — nothing sorts them. `date` is what a reader
 * sees; `dateTime` is the machine-readable ISO form on the <time> element.
 */
const SEMESTER = 'Fall 2026'

const EVENTS = [
  {
    date: 'Sep 28',
    dateTime: '2026-09-28',
    title: 'Semester kick-off',
    detail: 'Placeholder — replace with the real event and its details.',
  },
  {
    date: 'Oct 12',
    dateTime: '2026-10-12',
    title: 'Actuarial exam info session',
    detail: 'Placeholder — replace with the real event and its details.',
  },
  {
    date: 'Nov 7',
    dateTime: '2026-11-07',
    title: 'Datathon',
    detail: 'Placeholder — replace with the real event and its details.',
  },
  {
    date: 'Nov 23',
    dateTime: '2026-11-23',
    title: 'Industry night',
    detail: 'Placeholder — replace with the real event and its details.',
  },
]

function Calendar() {
  return (
    <section className="section calendar" id="calendar">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">§ 02</span>
          <span>Semester calendar</span>
        </Reveal>

        <div className="calendar-head">
          <Reveal as="h2">{SEMESTER}</Reveal>
          <Reveal className="calendar-note micro" delay={0.1}>
            Times and rooms are announced on the blog
          </Reveal>
        </div>

        <ol className="calendar-list">
          {EVENTS.map(({ date, dateTime, title, detail }, i) => (
            <Reveal as="li" key={dateTime} className="event-row" delay={i * 0.08} y={20}>
              <time className="event-date" dateTime={dateTime}>{date}</time>
              <div className="event-body">
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default Calendar
