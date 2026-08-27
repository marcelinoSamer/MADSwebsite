function Hero() {
  return (
    <section className="hero">
      <img className="hero-watermark" src="/Logos/logo_transparent.svg" alt="" aria-hidden="true" />
      <div className="container">
        <p className="hero-eyebrow">AUC · Mathematics, Actuarial &amp; Data Science Association</p>
        <h1>Where numbers become decisions.</h1>
        <p>
          MADS brings together students across mathematics, actuarial
          science, and data science to build the skills, community, and
          opportunities that go beyond the classroom.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#pillars">Explore what we do</a>
          <a className="btn btn-on-navy" href="#join">Join the community</a>
        </div>
      </div>
    </section>
  )
}

export default Hero