import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router'
import './App.css'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import Landing from './pages/Landing'

// Landing is the entry point and stays in the main bundle. The inner routes
// are split out — the markdown renderer alone is most of the JS on this site,
// and a visitor who only ever sees the homepage should not download it.
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const Syllabi = lazy(() => import('./pages/Syllabi'))
const FormPage = lazy(() => import('./pages/FormPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteFallback() {
  return (
    <div className="container route-fallback">
      <p className="state state-loading" role="status">Loading…</p>
    </div>
  )
}

function App() {
  return (
    <>
      <div className="lattice" aria-hidden="true" />
      <div className="page">
        <ScrollToTop />
        <Navbar />
        <main>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/syllabi" element={<Syllabi />} />
              <Route path="/forms/:slug" element={<FormPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default App
