import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import './index.css';
import App from './App.jsx';
import { msalInstance } from './auth/msalConfig';

async function bootstrapApp() {
  const bootstrapId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    console.log('[MSAL] initialize', {
      bootstrapId,
      href: window.location.href,
      timestamp: new Date().toISOString(),
    });
    await msalInstance.initialize();
    console.log('[MSAL] initialize complete', { bootstrapId });

    try {
      console.log('[MSAL] handleRedirectPromise start', {
        bootstrapId,
        href: window.location.href,
        hashPresent: Boolean(window.location.hash),
      });
      const redirectResult = await msalInstance.handleRedirectPromise();
      console.log('[MSAL] handleRedirectPromise result', {
        bootstrapId,
        hasResult: Boolean(redirectResult),
        account: redirectResult?.account?.username || null,
        scopes: redirectResult?.scopes || [],
      });
    } catch (redirectError) {
      console.error('[MSAL] handleRedirectPromise error', {
        bootstrapId,
        name: redirectError?.name,
        errorCode: redirectError?.errorCode,
        subError: redirectError?.subError,
        message: redirectError?.message,
        stack: redirectError?.stack,
      });
    }

    console.log('[MSAL] accounts', msalInstance.getAllAccounts().map((account) => ({
      homeAccountId: account.homeAccountId,
      username: account.username,
      tenantId: account.tenantId,
    })));
    console.log('[MSAL] active account', msalInstance.getActiveAccount()?.username || null);

    console.log('[REACT] render start', { bootstrapId });
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
