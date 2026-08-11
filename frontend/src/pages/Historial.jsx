import { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { getEntregas } from '../services/api';

function Historial() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const pageLimit = 20;

  useEffect(() => {
    let isActive = true;
    const cargar = async () => {
      setLoading(true);
      try {
        const response = await getEntregas({ page, limit: pageLimit });
        if (isActive) {
          setEntregas(response.data?.data || []);
          setPagination(response.data?.pagination || { page, totalPages: 0, total: 0 });
        }
      } catch (error) {
        console.error(error);
        if (isActive) setToast({ type: 'error', message: 'No se pudo cargar el historial.' });
      } finally {
        if (isActive) setLoading(false);
      }
    };

    cargar();
    return () => { isActive = false; };
  }, [page]);

  const filtered = useMemo(() => entregas.filter((item) => (
    [item.material, item.modelo, item.receptor, item.departamento, item.entregadoPor]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase())
  )), [entregas, search]);

  return (
    <PageShell
      title="Historial"
      subtitle="Consulta y seguimiento de movimientos"
      actions={<div className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en esta página" aria-label="Buscar en esta página" /></div>}
    >
      <section className="panel">
        <div className="panel__header panel__header--compact">
          <div><h2>Registro de entregas</h2><p>{pagination.total} movimientos registrados</p></div>
        </div>
        {loading ? (
          <div className="panel__body"><LoadingState rows={8} /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">{search ? 'No hay coincidencias en esta página.' : 'No hay entregas para mostrar.'}</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Material</th><th>Cantidad</th><th>Receptor</th><th>Departamento</th><th>Entregado por</th></tr></thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.fechaEntrega).toLocaleDateString()}</td>
                    <td><strong>{item.material}</strong><span className="table-secondary">{item.modelo}</span></td>
                    <td>{item.cantidad}</td>
                    <td>{item.receptor}</td>
                    <td><span className="tag">{item.departamento}</span></td>
                    <td>{item.entregadoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>{pagination.total} entregas</span>
          <div className="pagination__controls">
            <button className="button button--secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || page <= 1}>Anterior</button>
            <span>Página <strong>{pagination.page}</strong> de <strong>{pagination.totalPages || 1}</strong></span>
            <button className="button button--secondary" type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || pagination.totalPages === 0 || page >= pagination.totalPages}>Siguiente</button>
          </div>
        </div>
      </section>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default Historial;
