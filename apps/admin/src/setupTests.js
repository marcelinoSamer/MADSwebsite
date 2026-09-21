import '@testing-library/jest-dom'

// jsdom implements no scrolling, and route changes call these.
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
