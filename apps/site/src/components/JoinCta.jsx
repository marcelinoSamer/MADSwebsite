import { Link } from 'react-router'
import Reveal from './Reveal'
import NewsletterSignup from './NewsletterSignup'

function JoinCta() {
  return (
    <section className="join" id="join">
      <div className="container">
        <Reveal className="cta-band">
          <div>
            <p className="micro">§ 03 — Newsletter</p>
            <h2>
              Keep an eye on <em>the term.</em>
            </h2>
            <p>One email when something is happening. Nothing else.</p>
          </div>
          <NewsletterSignup />
        </Reveal>

        <Reveal className="join-aside micro" delay={0.1}>
          <span>Something on your mind?</span>
          <Link to="/forms/feedback">Send us feedback →</Link>
        </Reveal>
      </div>
    </section>
  )
}

export default JoinCta
