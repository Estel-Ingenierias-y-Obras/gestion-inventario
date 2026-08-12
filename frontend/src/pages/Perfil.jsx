import PageShell from '../components/PageShell';
import { useProfile } from '../hooks/useProfile';

function Perfil() {
  const profile = useProfile();

  return (
    <PageShell title="Perfil" subtitle="Información de cuenta y acceso">
      <section className="profile-card">
        <div className="profile-card__identity">
          <div className="profile-card__avatar" aria-hidden="true">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3>{profile.displayName}</h3>
            <p>{profile.email}</p>
          </div>
        </div>
        <div className="profile-card__details">
          <div className="profile-detail"><strong>Tenant</strong><span>{profile.tenantId}</span></div>
          <div className="profile-detail"><strong>ID de cuenta</strong><span>{profile.id}</span></div>
          <div className="profile-detail"><strong>Último acceso</strong><span>{new Date().toLocaleString()}</span></div>
        </div>
      </section>
    </PageShell>
  );
}

export default Perfil;
