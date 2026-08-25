import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AccessGuard from './components/AccessGuard';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaEntrega from './pages/NuevaEntrega';
import Historial from './pages/Historial';
import Perfil from './pages/Perfil';
import Configuracion from './pages/Configuracion';
import UsuariosConfiguracion from './pages/UsuariosConfiguracion';
import CorreosConfiguracion from './pages/CorreosConfiguracion';
import DepartamentosConfiguracion from './pages/DepartamentosConfiguracion';
import DepartamentoDetalle from './pages/DepartamentoDetalle';
import NoAutorizado from './pages/NoAutorizado';
import RegistroMaterial from './pages/RegistroMaterial';
import Almacen from './pages/Almacen';
import HistorialPedidos from './pages/HistorialPedidos';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/no-autorizado" element={<NoAutorizado />} />
          <Route element={<AccessGuard />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/entregas/nueva" element={<NuevaEntrega />} />
              <Route path="/historial" element={<Historial />} />
              <Route path="/registro-material" element={<RegistroMaterial />} />
              <Route path="/almacen" element={<Almacen />} />
              <Route path="/almacen/historial" element={<HistorialPedidos />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route element={<AdminRoute />}>
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/configuracion/usuarios" element={<UsuariosConfiguracion />} />
                <Route path="/configuracion/correos" element={<CorreosConfiguracion />} />
                <Route path="/configuracion/departamentos" element={<DepartamentosConfiguracion />} />
                <Route path="/departamentos/:id" element={<DepartamentoDetalle />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="/" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
