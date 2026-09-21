import { Link } from 'react-router'
import SectionLink from './SectionLink'

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <img src="/Logos/logo2.svg" alt="MADS logo" />
          <span className="micro">MADS AUC © 2026</span>
        </div>
        <ul className="footer-links micro">
          <li><SectionLink hash="#about">About</SectionLink></li>
          <li><SectionLink hash="#pillars">What we do</SectionLink></li>
          <li><Link to="/blog">Blog</Link></li>
          <li><Link to="/syllabi">Syllabi</Link></li>
          <li><Link to="/forms/feedback">Feedback</Link></li>
          <li><SectionLink hash="#join">Join</SectionLink></li>
        </ul>
      </div>
    </footer>
  )
}

export default Footer
