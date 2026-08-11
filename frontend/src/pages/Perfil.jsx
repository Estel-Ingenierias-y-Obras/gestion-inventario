import PageShell from '../components/PageShell';
import { useProfile } from '../hooks/useProfile';

function Perfil() {
  const profile = useProfile();

  return (
    <PageShell title="Perfil" subtitle="Información de cuenta y acceso">
      <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 30px rgba(15,23,42,0.08)', maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{profile.displayName}</h3>
            <p style={{ margin: 0, color: '#64748b' }}>{profile.email}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <div style={{ padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '12px' }}><strong>Tenant:</strong> {profile.tenantId}</div>
          <div style={{ padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '12px' }}><strong>ID de cuenta:</strong> {profile.id}</div>
          <div style={{ padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '12px' }}><strong>Último acceso:</strong> {new Date().toLocaleString()}</div>
        </div>
      </div>
    </PageShell>
  );
}

export default Perfil;
