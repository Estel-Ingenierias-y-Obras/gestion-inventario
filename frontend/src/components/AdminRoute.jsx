import { Navigate, Outlet } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';

function AdminRoute() {
  const { isAdmin } = useAccess();
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export default AdminRoute;
