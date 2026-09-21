import { Link, useLocation } from 'react-router'

/**
 * A link to a landing-page section, from anywhere.
 *
 * On `/` it renders a bare `<a href="#about">` so the browser's own smooth
 * scroll and `scroll-padding-top` handle it, exactly as before the router
 * existed. From any other route it has to be a real navigation to `/#about`,
 * which ScrollToTop then resolves once the section has mounted.
 */
function SectionLink({ hash, children, ...rest }) {
  const onLanding = useLocation().pathname === '/'

  return onLanding ? (
    <a href={hash} {...rest}>{children}</a>
  ) : (
    <Link to={`/${hash}`} {...rest}>{children}</Link>
  )
}

export default SectionLink
