const team = [
  { initials: 'PN', name: 'Full Name', role: 'President', color: 'pillar-m' },
  { initials: 'VP', name: 'Full Name', role: 'Vice President', color: 'pillar-ax' },
  { initials: 'TR', name: 'Full Name', role: 'Treasurer', color: 'pillar-d' },
  { initials: 'DA', name: 'Full Name', role: 'Head of Academics', color: 'pillar-int' },
  { initials: 'DO', name: 'Full Name', role: 'Head of Advocacy', color: 'pillar-m' },
  { initials: 'DM', name: 'Full Name', role: 'Head of Marketing', color: 'pillar-ax' },
]

function TeamContact() {
  return (
    <section className="section" id="contact">
      <div className="container">
        <p className="eyebrow">Get in touch</p>
        <h2>Meet the team behind MADS.</h2>
        <div className="team-grid">
          {team.map((member) => (
            <div className="team-card" key={member.name + member.role}>
              <div className={`avatar ${member.color}`}>{member.initials}</div>
              <h3>{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <div className="team-contact-links">
                <a href="mailto:mads@aucegypt.edu" aria-label={`Email ${member.name}`}>Email</a>
                <a href="#" aria-label={`${member.name} on LinkedIn`}>LinkedIn</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TeamContact