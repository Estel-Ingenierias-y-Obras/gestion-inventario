function PageShell({ title, subtitle, children, actions }) {
  return (
    <section className="page-shell">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export default PageShell;
