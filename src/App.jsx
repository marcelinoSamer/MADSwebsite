import './App.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Pillars from './components/Pillars'
import Activities from './components/Activities'
import JoinCta from './components/JoinCta'
import Footer from './components/Footer'

function App() {
  return (
    <div>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Pillars />
        <Activities />
        <JoinCta />
      </main>
      <Footer />
    </div>
  )
}

export default App