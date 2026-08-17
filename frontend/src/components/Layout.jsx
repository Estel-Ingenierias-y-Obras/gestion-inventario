import { Link, NavLink, Outlet } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useAccess } from '../context/AccessContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/entregas/nueva', label: 'Nueva entrega' },
  { to: '/historial', label: 'Historial' },
  { to: '/almacen', label: 'Almacén' },
];

function Layout() {
  const { accounts, instance } = useMsal();
  const { isAdmin } = useAccess();
  const userName = accounts[0]?.name || 'Usuario';
  const userEmail = accounts[0]?.username || 'usuario@empresa.com';

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true"><img src="/estel-isotipo-corporativo.png" alt="" /></div>
          <div className="brand__copy">
            <div className="brand__title">Gestión de Inventario</div>
            <div className="brand__subtitle">Centro de operaciones</div>
          </div>
        </div>

        <nav className="main-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `main-nav__link${isActive ? ' main-nav__link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="user-menu">
          <Link className="user-profile-link" to="/perfil" aria-label="Abrir perfil">
            <div className="user-menu__copy">
              <div className="user-menu__name">{userName}</div>
              <div className="user-menu__email">{userEmail}</div>
            </div>
            <div className="user-menu__avatar">{userName.charAt(0).toUpperCase()}</div>
          </Link>
          {isAdmin ? (
            <Link className="settings-link" to="/configuracion" aria-label="Abrir configuración" title="Configuración">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-.1-1.2 2-1.5-2-3.4-2.4 1a8 8 0 0 0-2-1.2L15.2 3h-4l-.4 2.7a8 8 0 0 0-2 1.2l-2.5-1-2 3.4 2.1 1.5a8 8 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4l.4-2.7a8 8 0 0 0 2-1.2l2.4 1 2-3.4-2.1-1.5.1-1.2Z" /></svg>
            </Link>
          ) : null}
          <button type="button" onClick={handleLogout} className="button button--topbar">Salir</button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
