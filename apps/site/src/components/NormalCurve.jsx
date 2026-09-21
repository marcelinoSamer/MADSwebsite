// A normal distribution drawn across the foot of the hero. Purely
// decorative — the curve carries no information the copy doesn't already,
// so it stays out of the accessibility tree.

const CURVE =
  'M 10 190 C 150 190 230 186 290 140 C 330 105 355 32 400 32 ' +
  'C 445 32 470 105 510 140 C 570 186 650 190 790 190'

const TICKS = [
  { x: 180, label: '−2σ' },
  { x: 290, label: '−1σ' },
  { x: 400, label: 'μ', mean: true },
  { x: 510, label: '1σ' },
  { x: 620, label: '2σ' },
]

function NormalCurve() {
  return (
    <figure className="curve" aria-hidden="true">
      <svg viewBox="0 0 800 226" role="presentation" focusable="false">
        <path className="curve-area" d={`${CURVE} Z`} />
        <line className="curve-axis" x1="10" y1="190" x2="790" y2="190" />

        {TICKS.map(({ x, label, mean }, i) => (
          <g key={label}>
            <line
              className={`curve-tick tick-${i + 1}`}
              x1={x}
              y1="190"
              x2={x}
              y2="198"
            />
            <text
              className={`curve-label tick-${i + 1}${mean ? ' is-mean' : ''}`}
              x={x}
              y="214"
            >
              {label}
            </text>
          </g>
        ))}

        <path className="curve-path" d={CURVE} pathLength="1" />
      </svg>
    </figure>
  )
}

export default NormalCurve
