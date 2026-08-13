import { useEffect } from 'react';
import { useIsAuthenticated } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, msalInstance } from '../auth/msalConfig';

function Login() {
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[LOGIN] authentication state', {
      isAuthenticated,
      route: window.location.pathname,
    });

    if (isAuthenticated) {
      console.log('[LOGIN] navigating to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    console.log('[LOGIN] loginRedirect called', {
      route: window.location.pathname,
      scopes: loginRequest.scopes,
      timestamp: new Date().toISOString(),
    });
    msalInstance.loginRedirect(loginRequest);
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-panel__content">
          <div className="login-brand">
            <div className="brand__mark" aria-hidden="true"><img src="/estel-isotipo-corporativo.png" alt="" /></div>
            <span>Gestión de Inventario</span>
          </div>
          <h1>Bienvenido de nuevo</h1>
          <p className="login-panel__lead">Accede al centro de operaciones para gestionar las entregas y consultar la actividad del inventario.</p>
          <button type="button" onClick={handleLogin} className="button button--primary">
            Iniciar sesión con Microsoft
          </button>
          <p className="login-panel__note"><span aria-hidden="true">◆</span> Acceso corporativo seguro</p>
        </div>
      </section>
      <aside className="login-visual" aria-label="Plataforma corporativa de gestión">
        <span className="login-visual__eyebrow">Centro de operaciones</span>
        <h2>Control y trazabilidad en un único espacio.</h2>
        <p>Una plataforma empresarial diseñada para simplificar la gestión diaria del inventario.</p>
      </aside>
    </main>
  );
}

export default Login;
