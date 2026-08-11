import { useEffect } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, msalInstance } from '../auth/msalConfig';

function Login() {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    msalInstance.loginRedirect(loginRequest);
  };

  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <h1>Gestión de Inventario</h1>
      <p>Inicia sesión para acceder al panel de inventario.</p>
      <button type="button" onClick={handleLogin} style={{ padding: '0.75rem 1.25rem', cursor: 'pointer' }}>
        Iniciar sesión con Microsoft
      </button>
    </div>
  );
}

export default Login;
