import Reveal from './Reveal'

const PILLARS = [
  {
    key: 'm',
    symbol: 'M',
    name: 'Mathematics',
    blurb: 'Pure and applied problem-solving at the core of everything we do.',
  },
  {
    key: 'ax',
    symbol: 'Āx',
    name: 'Actuarial science',
    blurb: 'Risk, insurance, and the math behind real-world uncertainty.',
  },
  {
    key: 'd',
    symbol: 'D',
    name: 'Data science',
    blurb: 'Turning raw numbers into models, patterns, and decisions.',
  },
  {
    key: 'int',
    symbol: '∫',
    name: 'Applied analysis',
    blurb: 'Where theory meets practice, competitions, cases, and research.',
  },
]

function Pillars() {
  return (
    <section className="section pillars" id="pillars">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">§ 02</span>
          <span>What we do</span>
        </Reveal>

        <div className="pillars-head">
          <Reveal as="h2">
            Four disciplines, <em>one community.</em>
          </Reveal>
          <Reveal className="pillars-glyphs" delay={0.15} aria-hidden="true">
            M · Āx · D · ∫
          </Reveal>
        </div>

        <div className="pillars-table">
          {PILLARS.map(({ key, symbol, name, blurb }, i) => (
            <Reveal
              key={key}
              className={`pillar-row pillar-${key}`}
              delay={i * 0.08}
              y={20}
            >
              <span className="pillar-symbol" aria-hidden="true">{symbol}</span>
              <h3>{name}</h3>
              <p>{blurb}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Pillars
