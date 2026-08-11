import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { msalInstance } from '../auth/msalConfig';

function Inventario() {
  const { accounts, instance } = useMsal();
  const navigate = useNavigate();
  const nombreUsuario = accounts[0]?.name || 'usuario';

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div style={{ maxWidth: '700px', margin: '4rem auto', padding: '2rem' }}>
      <h1>Bienvenido {nombreUsuario}</h1>
      <p>Has accedido correctamente al módulo de inventario.</p>
      <button type="button" onClick={handleLogout} style={{ padding: '0.75rem 1.25rem', cursor: 'pointer', marginTop: '1rem' }}>
        Cerrar sesión
      </button>
    </div>
  );
}

export default Inventario;
