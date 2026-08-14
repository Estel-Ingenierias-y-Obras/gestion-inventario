import { useCallback, useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { deleteEntrega, getEntregas } from '../services/api';

const periods = [
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'all', label: 'Todas' },
];

const emptyPagination = { page: 1, totalPages: 0, total: 0 };

function Historial() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [selectedEntrega, setSelectedEntrega] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const pageLimit = 20;

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let isActive = true;
    const cargar = async () => {
      setLoading(true);
      try {
        const response = await getEntregas({ page, limit: pageLimit, period, search: debouncedSearch });
        if (isActive) {
          setEntregas(response.data?.data || []);
          setPagination(response.data?.pagination || emptyPagination);
        }
      } catch {
        if (isActive) setToast({ type: 'error', message: 'Error al realizar la operación.' });
      } finally {
        if (isActive) setLoading(false);
      }
    };

    cargar();
    return () => { isActive = false; };
  }, [page, period, debouncedSearch, refreshKey]);

  useEffect(() => {
    if (!selectedEntrega) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !deleting) setSelectedEntrega(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntrega, deleting]);

  const updateSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const updatePeriod = (value) => {
    setPeriod(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!selectedEntrega) return;
    setDeleting(true);
    try {
      await deleteEntrega(selectedEntrega._id);
      setSelectedEntrega(null);
      setToast({ type: 'success', message: 'Entrega eliminada correctamente.' });
      if (entregas.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch {
      setToast({ type: 'error', message: 'Error al realizar la operación.' });
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters = period !== 'all' || Boolean(debouncedSearch);
  const emptyMessage = hasFilters
    ? 'No se encontraron entregas con los filtros seleccionados.'
    : 'No hay entregas para mostrar.';

  return (
    <PageShell
      title="Historial"
      subtitle="Consulta y seguimiento de movimientos"
      actions={(
        <div className="search-box">
          <span className="search-box__icon" aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Buscar material, receptor, departamento…"
            aria-label="Buscar entregas"
          />
          {search ? <button type="button" className="search-box__clear" onClick={() => updateSearch('')} aria-label="Limpiar búsqueda">×</button> : null}
        </div>
      )}
    >
      <div className="history-toolbar" aria-label="Filtros del historial">
        <span className="history-toolbar__label">Ver entregas de</span>
        <div className="period-filter">
          {periods.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`period-filter__button${period === option.value ? ' period-filter__button--active' : ''}`}
              onClick={() => updatePeriod(option.value)}
              disabled={loading && period === option.value}
              aria-pressed={period === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="panel">
        <div className="panel__header panel__header--compact">
          <div><h2>Registro de entregas</h2><p>{loading ? 'Actualizando resultados…' : `${pagination.total} movimientos encontrados`}</p></div>
          {loading ? <span className="loading-indicator"><span /> Cargando</span> : null}
        </div>
        {loading ? (
          <div className="panel__body"><LoadingState rows={8} /></div>
        ) : entregas.length === 0 ? (
          <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">⌕</span><strong>Sin resultados</strong><p>{emptyMessage}</p></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table history-table">
              <thead><tr><th>Fecha</th><th>Material</th><th>Cantidad</th><th>Receptor</th><th>Departamento</th><th>Entregado por</th><th className="actions-column">Acciones</th></tr></thead>
              <tbody>
                {entregas.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.fechaEntrega).toLocaleDateString()}</td>
                    <td><strong>{item.material}</strong><span className="table-secondary">{item.modelo}</span></td>
                    <td>{item.cantidad}</td>
                    <td>{item.receptor}</td>
                    <td><span className="tag">{item.departamento}</span></td>
                    <td>{item.entregadoPor}</td>
                    <td className="actions-column">
                      <button type="button" className="icon-button icon-button--delete" onClick={() => setSelectedEntrega(item)} aria-label={`Eliminar entrega de ${item.material}`} title="Eliminar entrega">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg>
                      </button>
                    </td>
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

      {selectedEntrega ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setSelectedEntrega(null); }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
            <div className="confirm-modal__icon" aria-hidden="true">!</div>
            <div className="confirm-modal__content">
              <h2 id="delete-title">¿Está seguro de que desea eliminar esta entrega?</h2>
              <p id="delete-description">Esta acción no se puede deshacer.</p>
              <div className="confirm-modal__summary"><strong>{selectedEntrega.material}</strong><span>{selectedEntrega.modelo} · {selectedEntrega.receptor}</span></div>
            </div>
            <div className="confirm-modal__actions">
              <button type="button" className="button button--secondary" onClick={() => setSelectedEntrega(null)} disabled={deleting}>Cancelar</button>
              <button type="button" className="button button--danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Eliminando…' : 'Eliminar'}</button>
            </div>
          </section>
        </div>
      ) : null}

      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default Historial;
