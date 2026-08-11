function PageShell({ title, subtitle, children, actions }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.7rem', color: '#111827' }}>{title}</h1>
          {subtitle ? <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default PageShell;
