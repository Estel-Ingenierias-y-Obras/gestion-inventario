import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AccessContext } from '../context/AccessContext';
import { getAccessStatus } from '../services/api';
import LoadingState from './LoadingState';

function AccessGuard() {
  const [state, setState] = useState({ loading: true, authorized: false, isAdmin: false, email: '' });

  useEffect(() => {
    let active = true;

    getAccessStatus()
      .then((response) => {
        if (active) setState({ loading: false, ...response.data.data });
      })
      .catch((error) => {
        if (!active) return;
        const unauthorized = error?.response?.status === 403 && error?.response?.data?.code === 'NOT_WHITELISTED';
        setState({ loading: false, authorized: false, isAdmin: false, email: '', error: unauthorized ? null : 'No se pudo comprobar el acceso.' });
      });

    return () => { active = false; };
  }, []);

  if (state.loading) {
    return <main className="access-loading"><div><h1>Comprobando acceso</h1><LoadingState rows={3} /></div></main>;
  }

  if (!state.authorized) {
    return <Navigate to="/no-autorizado" replace state={{ error: state.error }} />;
  }

  return <AccessContext.Provider value={state}><Outlet /></AccessContext.Provider>;
}

export default AccessGuard;
