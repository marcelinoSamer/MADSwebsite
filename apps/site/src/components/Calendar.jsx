import { useQuery } from '@mads/db/react'
import { todayIso } from '@mads/db'
import Reveal from './Reveal'
import AsyncState from './AsyncState'
import { eventDateLabel, eventWhere, semesterOf } from '../lib/format'

/**
 * The semester calendar — what is coming up, from today.
 *
 * Read from the `events` table, which the admin panel's Calendar page writes
 * (anyone whose role carries events:write). Members-only events never reach
 * this list: events_read hides them from anonymous readers in the database.
 *
 * Past events drop off on their own. A multi-day event stays until its last
 * day is over, which is why the bound is on the end date.
 */
function Calendar() {
  const today = todayIso()
  const { data: events, loading, error } = useQuery((c) => c.events.list({ from: today }), [today])

  return (
    <section className="section calendar" id="calendar">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">§ 02</span>
          <span>Semester calendar</span>
        </Reveal>

        <div className="calendar-head">
          <Reveal as="h2">{semesterOf(today)}</Reveal>
          <Reveal className="calendar-note micro" delay={0.1}>
            Details are announced on the blog
          </Reveal>
        </div>

        <AsyncState
          loading={loading}
          error={error}
          isEmpty={events?.length === 0}
          empty="Nothing is scheduled yet. Check back soon."
        >
          <ol className="calendar-list">
            {events?.map((event, i) => {
              const where = eventWhere(event)
              return (
                <Reveal as="li" key={event.id} className="event-row" delay={i * 0.08} y={20}>
                  <time className="event-date" dateTime={event.date}>
                    {eventDateLabel(event)}
                  </time>
                  <div className="event-body">
                    <h3>{event.title}</h3>
                    {where && <p className="event-where">{where}</p>}
                    {event.description && <p>{event.description}</p>}
                  </div>
                </Reveal>
              )
            })}
          </ol>
        </AsyncState>
      </div>
    </section>
  )
}

export default Calendar
