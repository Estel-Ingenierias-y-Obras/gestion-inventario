import { useState } from 'react';
import { msalInstance, loginRequest } from './auth/msalConfig';

function TestMsalMinimal() {
  const [error, setError] = useState('');
  const [account, setAccount] = useState(null);

  const handleLogin = async () => {
    try {
      console.log('[MSAL test] invoking loginPopup');
      const response = await msalInstance.loginPopup({
        ...loginRequest,
        redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
      });
      console.log('LOGIN RESPONSE', response);
      console.log('ACCOUNT', response?.account);
      console.log('ALL ACCOUNTS', msalInstance.getAllAccounts());
      console.log('ACTIVE ACCOUNT', msalInstance.getActiveAccount());
      msalInstance.setActiveAccount(response.account);
      console.log('ACTIVE ACCOUNT AFTER SET', msalInstance.getActiveAccount());
      setAccount(response.account);
      console.log('[MSAL test] login success', response.account);
    } catch (err) {
      console.error('Test login error', err);
      setError(String(err));
    }
  };

  return (
    <div>
      <button onClick={handleLogin}>Login test</button>
      {error && <pre>{error}</pre>}
      {account && <pre>{JSON.stringify(account, null, 2)}</pre>}
    </div>
  );
}

export default TestMsalMinimal;
