import { Navigate, Outlet } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';

function ProtectedRoute() {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
