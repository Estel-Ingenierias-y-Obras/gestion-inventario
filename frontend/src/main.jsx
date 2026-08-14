import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import './index.css';
import App from './App.jsx';
import { msalInstance } from './auth/msalConfig';

async function bootstrapApp() {
  try {
    await msalInstance.initialize();

    try {
      await msalInstance.handleRedirectPromise();
    } catch {
      // MSAL conserva su propio estado de error; la aplicación puede mostrar el login.
    }

    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </StrictMode>
    );
  } catch {
    // Evita exponer detalles de autenticación en la consola del navegador.
  }
}

bootstrapApp();
