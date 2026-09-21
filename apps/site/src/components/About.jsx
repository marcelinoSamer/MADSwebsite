import Reveal from './Reveal'

function About() {
  return (
    <section className="section about" id="about">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">§ 01</span>
          <span>Our vision</span>
        </Reveal>

        <div className="about-grid">
          <Reveal className="about-note micro">
            Mathematics, actuarial science and data science, studied
            together rather than apart.
          </Reveal>

          <Reveal delay={0.1}>
            <h2>
              Making a demanding field feel like <em>home.</em>
            </h2>
            <p className="section-lead">
              Mathematics, actuarial science, and data science share a way of
              thinking, precise, rigorous, and quietly powerful. MADS exists
              to give students in these majors a space to grow that thinking
              together: through competitions, industry exposure, and a
              community that takes ideas seriously.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export default About
