import '@testing-library/jest-dom'

// jsdom implements no scrolling at all, and ScrollToTop calls both of these
// on every route change. Without stubs each navigation logs a "Not
// implemented" warning that buries real failures.
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}

// jsdom has no IntersectionObserver, which Motion's `whileInView` relies on
// (see Reveal.jsx). Report every observed element as visible so components
// render in their settled state under test.
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback
    }

    observe(target) {
      this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }], this)
    }

    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}
