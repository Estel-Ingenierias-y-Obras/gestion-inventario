import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';

function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  console.log('[ROUTER] protected route check', {
    pathname: location.pathname,
    isAuthenticated,
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
