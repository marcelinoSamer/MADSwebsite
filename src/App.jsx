import './App.css'

function App() {
  return (
    <div className="page">
      <header className="nav">
        <div className="container nav-inner">
          <span className="logo">Alto</span>
          <ul className="nav-links">
            <li>
              <a href="#features">Features</a>
            </li>
          </ul>
          <div className="nav-actions">
            <a className="nav-signin" href="#signin">
              Sign in
            </a>
            <a className="btn btn-primary" href="#signup">
              Get started
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy reveal">
              <h1>Plan your work without the busywork.</h1>
              <p>
                Alto turns scattered tasks into one clear plan, so your team
                spends less time organizing and more time building.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary btn-lg" href="#signup">
                  Get started
                </a>
                <a className="btn btn-secondary btn-lg" href="#demo">
                  View demo
                </a>
              </div>
            </div>
            <div className="hero-visual reveal reveal-delay">
              <img
                src="https://picsum.photos/seed/alto-workspace-flow/900/750"
                alt="A calm, organized workspace with a laptop and notes"
                width="900"
                height="750"
              />
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container">
            <div className="section-head">
              <h2>Everything you need, nothing you don't</h2>
              <p>
                A small set of tools, tuned for how teams actually plan and
                ship work.
              </p>
            </div>

            <div className="features-grid">
              <article className="feature-card feature-lead">
                <img
                  src="https://picsum.photos/seed/alto-team-collab/900/560"
                  alt="A team reviewing a project plan together"
                  width="900"
                  height="560"
                />
                <div className="feature-text">
                  <h3>See your whole day at a glance</h3>
                  <p>
                    Every task, deadline, and update lives on one board, so
                    nothing gets lost between tools.
                  </p>
                </div>
              </article>

              <article className="feature-card feature-tint">
                <h3>Smart reminders</h3>
                <p>Alto nudges you before deadlines slip, not after.</p>
              </article>

              <article className="feature-card">
                <h3>Works with your tools</h3>
                <p>
                  Connect your calendar and existing task list in a few
                  clicks.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="cta-band">
              <div>
                <h2>Ready to bring order to your day?</h2>
                <p>Start free. No credit card required.</p>
              </div>
              <a className="btn btn-on-accent btn-lg" href="#signup">
                Get started
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <span className="logo">Alto</span>
            <span>© 2026 Alto. All rights reserved.</span>
          </div>
          <ul className="footer-links">
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#signin">Sign in</a>
            </li>
            <li>
              <a href="#signup">Get started</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}

export default App
