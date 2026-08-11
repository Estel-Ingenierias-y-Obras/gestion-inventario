import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import './index.css';
import App from './App.jsx';
import { msalInstance } from './auth/msalConfig';

async function bootstrapApp() {
  try {
    console.log('[MSAL] initializing');
    await msalInstance.initialize();
    await msalInstance.handleRedirectPromise();

    createRoot(document.getElementById('root')).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </StrictMode>
    );
  } catch (error) {
    console.error('Error al inicializar MSAL:', error);
  }
}

bootstrapApp();
