import { createContext, useContext } from 'react';

export const AccessContext = createContext({ authorized: false, isAdmin: false, email: '' });
export const useAccess = () => useContext(AccessContext);
