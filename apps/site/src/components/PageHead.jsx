import Reveal from './Reveal'

/**
 * The masthead every inner route opens with.
 *
 * Inner routes are documents, not landing-page sections: someone arrives at
 * /blog or /syllabi to find one specific thing, so the head is compact — a
 * ruled eyebrow, a title set well below the landing page's display sizes, and
 * a lead — and hands the viewport over to the content as quickly as it can.
 * `children` is the toolbar slot (search, filters, counts); it sits on the
 * hairline that closes the head.
 */
function PageHead({ mark, eyebrow, title, lead, children }) {
  return (
    <header className="page-head">
      <div className="container">
        <Reveal className="page-eyebrow micro">
          <span className="num">{mark}</span>
          {eyebrow && <span>{eyebrow}</span>}
        </Reveal>

        <Reveal as="h1" delay={0.06}>{title}</Reveal>

        {lead && (
          <Reveal as="p" className="page-lead" delay={0.12}>
            {lead}
          </Reveal>
        )}

        {children}
      </div>
    </header>
  )
}

export default PageHead
