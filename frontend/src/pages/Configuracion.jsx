import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';

function Configuracion() {
  return (
    <PageShell title="Configuración" subtitle="Administración de accesos y comunicaciones automáticas">
      <div className="admin-menu">
        <Link className="admin-option" to="/configuracion/usuarios">
          <span className="admin-option__icon" aria-hidden="true">U</span>
          <div><h2>Usuarios</h2><p>Gestiona los usuarios autorizados de la whitelist.</p></div>
          <span className="admin-option__arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="admin-option" to="/configuracion/correos">
          <span className="admin-option__icon" aria-hidden="true">@</span>
          <div><h2>Correos</h2><p>Programa el envío automático de registros de entregas.</p></div>
          <span className="admin-option__arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </PageShell>
  );
}

export default Configuracion;
