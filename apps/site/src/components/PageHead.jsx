import Reveal from './Reveal'

/**
 * The masthead every inner route opens with. Mirrors the landing page's
 * `section-mark` + `h2` rhythm so a route change does not feel like a
 * different site — but uses `h1`, since an inner page's title is the
 * document's top-level heading.
 */
function PageHead({ mark, eyebrow, title, lead, children }) {
  return (
    <header className="page-head">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">{mark}</span>
          {eyebrow && <span>{eyebrow}</span>}
        </Reveal>
        <Reveal as="h1" delay={0.06}>{title}</Reveal>
        {lead && (
          <Reveal as="p" className="section-lead" delay={0.12}>
            {lead}
          </Reveal>
        )}
        {children}
      </div>
    </header>
  )
}

export default PageHead
