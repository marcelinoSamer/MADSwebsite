import Reveal from './Reveal'

function About() {
  return (
    <section className="section about" id="about">
      <div className="container">
        <Reveal className="section-mark micro">
          <span className="num">§ 01</span>
          <span>About</span>
        </Reveal>

        <Reveal className="about-body">
          <p>
            MADS is the student association for the mathematics, actuarial
            science, and data science majors at AUC. We run the talks,
            competitions, and workshops that happen around the coursework,
            keep an archive of past syllabi so you know what a course covers
            before you register, and pass on internships and opportunities
            as they reach us.
          </p>
          <p>
            Anyone in the three majors is already a member — there is nothing
            to sign. The calendar below is where the semester lives.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

export default About
