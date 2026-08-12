import { NavLink, Outlet } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/entregas/nueva', label: 'Nueva entrega' },
  { to: '/historial', label: 'Historial' },
  { to: '/perfil', label: 'Perfil' },
];

function Layout() {
  const { accounts, instance } = useMsal();
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
          <div className="user-menu__copy">
            <div className="user-menu__name">{userName}</div>
            <div className="user-menu__email">{userEmail}</div>
          </div>
          <div className="user-menu__avatar">{userName.charAt(0).toUpperCase()}</div>
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
