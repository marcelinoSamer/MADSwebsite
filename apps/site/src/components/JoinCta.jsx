import { Link } from 'react-router'
import Reveal from './Reveal'
import NewsletterSignup from './NewsletterSignup'

function JoinCta() {
  return (
    <section className="join" id="join">
      <div className="container">
        <Reveal className="cta-band">
          <div>
            <p className="micro">§ 04 — Membership</p>
            <h2>
              Ready to be part of <em>it?</em>
            </h2>
            <p>Join the MADS community and be first to hear about events.</p>
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
