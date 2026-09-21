/** Heading row for an admin page, with optional actions on the right. */
function PageTitle({ title, lead, children }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {children && <div className="page-title-actions">{children}</div>}
    </div>
  )
}

export default PageTitle
