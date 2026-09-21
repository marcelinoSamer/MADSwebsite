import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * A client-side route change keeps the old scroll position, which lands you
 * halfway down a new page. Reset on pathname change — but honour a hash,
 * since `/#about` from another route has to scroll to the section.
 *
 * `scroll-behavior: smooth` in index.css applies here, and the global
 * reduced-motion block already turns it off.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      // The target section may still be mounting on a fresh navigation.
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView()
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

export default ScrollToTop
