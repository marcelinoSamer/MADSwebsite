import './App.css'

function App() {
  return (
    <div>
      <header className="nav">
        <div className="container nav-inner">
          <div className="nav-brand">
          <img src="/Logos/logo2.svg" alt="MADS logo" />
        <span className="nav-wordmark">
          <span className="letter-m">M</span>
          <span className="letter-a">A</span>
          <span className="letter-d">D</span>
          <span className="letter-s">S</span>
       </span>
    </div>
          <ul className="nav-links">
            <li><a href="#about">About</a></li>
            <li><a href="#pillars">What we do</a></li>
            <li><a href="#activities">Activities</a></li>
            <li><a href="#join">Join</a></li>
          </ul>
          <a className="btn btn-primary" href="#join">Join MADS</a>
        </div>
      </header>

      <main>
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

        <section className="section about" id="about">
          <div className="container">
            <p className="eyebrow">Our vision</p>
            <h2>Making a demanding field feel like home.</h2>
            <p className="section-lead">
              Mathematics, actuarial science, and data science share a way of
              thinking, precise, rigorous, and quietly powerful. MADS exists
              to give students in these majors a space to grow that thinking
              together: through competitions, industry exposure, and a
              community that takes ideas seriously.
            </p>
          </div>
        </section>

        <section className="section" id="pillars">
          <div className="container">
            <p className="eyebrow">M · Āx · D · ∫</p>
            <h2>Four disciplines, one community.</h2>
            <div className="pillars-grid">
              <div className="pillar-card pillar-m">
                <div className="pillar-symbol">M</div>
                <h3>Mathematics</h3>
                <p>Pure and applied problem-solving at the core of everything we do.</p>
              </div>
              <div className="pillar-card pillar-ax">
                <div className="pillar-symbol">Āx</div>
                <h3>Actuarial science</h3>
                <p>Risk, insurance, and the math behind real-world uncertainty.</p>
              </div>
              <div className="pillar-card pillar-d">
                <div className="pillar-symbol">D</div>
                <h3>Data science</h3>
                <p>Turning raw numbers into models, patterns, and decisions.</p>
              </div>
              <div className="pillar-card pillar-int">
                <div className="pillar-symbol">∫</div>
                <h3>Applied analysis</h3>
                <p>Where theory meets practice, competitions, cases, and research.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section activities" id="activities">
          <div className="container">
            <p className="eyebrow">What we run</p>
            <h2>Built around what our members asked for.</h2>
            <div className="activities-grid">
              <div className="activity-row">
                <span className="mark">01</span>
                <p>Industry talks with professionals across finance, insurance, and tech.</p>
              </div>
              <div className="activity-row">
                <span className="mark">02</span>
                <p>Math and case competitions, from campus rounds to national stages.</p>
              </div>
              <div className="activity-row">
                <span className="mark">03</span>
                <p>Hands-on workshops connecting math to unexpected places.</p>
              </div>
              <div className="activity-row">
                <span className="mark">04</span>
                <p>A community that shares opportunities, internships, and support.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="join">
          <div className="container">
            <div className="cta-band">
              <div>
                <h2>Ready to be part of it?</h2>
                <p>Join the MADS community and be first to hear about events.</p>
              </div>
              <a className="btn btn-on-navy" href="#">Join now</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
           <img src="/Logos/logo2.svg" alt="MADS logo" />
            <span>MADS AUC © 2026</span>
          </div>
          <ul className="footer-links">
            <li><a href="#about">About</a></li>
            <li><a href="#pillars">What we do</a></li>
            <li><a href="#join">Join</a></li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

export default App