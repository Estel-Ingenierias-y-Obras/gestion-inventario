import { useMemo } from 'react';
import { useMsal } from '@azure/msal-react';

export function useProfile() {
  const { accounts } = useMsal();
  const account = accounts[0];

  return useMemo(() => ({
    displayName: account?.name || 'Usuario',
    email: account?.username || 'No disponible',
    tenantId: account?.tenantId || 'No disponible',
    id: account?.localAccountId || 'No disponible',
  }), [account]);
}
