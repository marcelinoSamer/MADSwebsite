import NormalCurve from './NormalCurve'

function Hero() {
  return (
    <section className="hero">
      <img
        className="hero-watermark"
        src="/Logos/logo_transparent.svg"
        alt=""
        aria-hidden="true"
      />
      <span className="hero-circle hero-circle-a" aria-hidden="true" />
      <span className="hero-circle hero-circle-b" aria-hidden="true" />

      <div className="container hero-inner">
        <p className="hero-eyebrow rise rise-1">
          MADS · The American University in Cairo
        </p>
        <h1 className="hero-title rise rise-2">
          Mathematics, Actuarial &amp; Data Science Association
        </h1>
        <p className="hero-lead rise rise-3">
          Run by students, for students in the three majors. This site keeps
          our syllabus archive, what we&apos;re running this semester, and the
          ways to reach us.
        </p>
      </div>

      <NormalCurve />
    </section>
  )
}

export default Hero
