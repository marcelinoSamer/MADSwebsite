import './App.css'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Pillars from './components/Pillars'
import Activities from './components/Activities'
import TeamContact from './components/TeamContact'
import JoinCta from './components/JoinCta'
import JoinForm from './components/JoinForm'
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
        <TeamContact />
        <JoinCta />
        <JoinForm />
      </main>
      <Footer />
    </div>
  )
}

export default App