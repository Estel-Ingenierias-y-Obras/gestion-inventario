import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaEntrega from './pages/NuevaEntrega';
import Historial from './pages/Historial';
import Perfil from './pages/Perfil';
import './App.css';

function RouteLogger() {
  const location = useLocation();

  useEffect(() => {
    console.log('[ROUTER] current route', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      timestamp: new Date().toISOString(),
    });
  }, [location]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteLogger />
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/entregas/nueva" element={<NuevaEntrega />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Route>
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
