function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-brand">
          <img src="/Logos/logo2.svg" alt="MADS logo" />
          <span className="nav-wordmark">
            <span className="letter-m">M</span>
            <span className="letter-a">A</span>
            <span className="letter-d">D</span>
            <span className="letter-s">S</span>
          </span>
        </div>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#pillars">What we do</a></li>
          <li><a href="#activities">Activities</a></li>
          <li><a href="#join">Join</a></li>
        </ul>
        <a className="btn btn-primary" href="#join">Join MADS</a>
      </div>
    </header>
  )
}

export default Navbar