import Reveal from './Reveal'

const ACTIVITIES = [
  'Industry talks with professionals across finance, insurance, and tech.',
  'Math and case competitions, from campus rounds to national stages.',
  'Hands-on workshops connecting math to unexpected places.',
  'A community that shares opportunities, internships, and support.',
]

function Activities() {
  return (
    <section className="section activities" id="activities">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">§ 03</span>
          <span>What we run</span>
        </Reveal>

        <Reveal as="h2">Built around what our members asked for.</Reveal>

        <div className="activities-grid">
          {ACTIVITIES.map((copy, i) => (
            <Reveal
              key={copy}
              className="activity-row"
              delay={i * 0.08}
              y={20}
            >
              <span className="mark">{String(i + 1).padStart(2, '0')}</span>
              <p>{copy}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Activities
