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
    <div style={{ minHeight: '100vh', background: '#f4f7fb' }}>
      <header style={{ background: 'linear-gradient(90deg, #0f172a 0%, #111827 100%)', color: 'white', padding: '0.95rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>GI</div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Gestión de Inventario</div>
            <div style={{ fontSize: '0.84rem', opacity: 0.8 }}>Microsoft 365-style operations hub</div>
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                padding: '0.65rem 0.9rem',
                borderRadius: '999px',
                textDecoration: 'none',
                color: isActive ? '#f8fafc' : '#cbd5e1',
                background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{userName}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{userEmail}</div>
          </div>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #60a5fa, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{userName.charAt(0).toUpperCase()}</div>
          <button type="button" onClick={handleLogout} style={{ padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.16)', background: 'transparent', color: 'white', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </header>

      <main style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
