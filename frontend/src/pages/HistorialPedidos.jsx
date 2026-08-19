import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { getMaterialOrderHistory } from '../services/api';

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function HistorialPedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let active = true;
    getMaterialOrderHistory()
      .then((response) => { if (active) setOrders(response.data?.data || []); })
      .catch((error) => { if (active) setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el historial de pedidos.' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return orders;
    return orders.filter((order) => [
      order.numeroPedido, order.material, order.modelo,
    ].some((value) => normalizeSearch(value).includes(query)));
  }, [orders, search]);

  return (
    <PageShell title="Historial de pedidos" subtitle="Pedidos agotados mediante el consumo de entregas" actions={(
      <div className="warehouse-page-actions">
        <div className="search-box">
          <span className="search-box__icon" aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido, material, modelo…" aria-label="Buscar en el historial de pedidos" />
          {search ? <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button> : null}
        </div>
        <Link className="button button--secondary" to="/almacen">Volver a almacén</Link>
      </div>
    )}>
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Pedidos agotados</h2><p>{filteredOrders.length} {filteredOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={6} /></div> : filteredOrders.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">⌕</span><strong>Sin resultados</strong><p>{search ? 'No hay pedidos que coincidan con la búsqueda.' : 'No hay pedidos agotados.'}</p></div> : (
          <div className="table-scroll"><table className="data-table warehouse-history-table"><thead><tr><th>N.º pedido</th><th>Material</th><th>Modelo</th><th>Cantidad inicial</th><th>Fecha creación</th><th>Fecha agotado</th></tr></thead><tbody>{filteredOrders.map((order) => (
            <tr key={order._id}><td><strong>{order.numeroPedido}</strong></td><td>{order.material}</td><td>{order.modelo}</td><td>{order.cantidadInicial}</td><td>{new Date(order.createdAt).toLocaleDateString('es-ES')}</td><td>{order.agotadoAt ? new Date(order.agotadoAt).toLocaleString('es-ES') : '—'}</td></tr>
          ))}</tbody></table></div>
        )}
      </section>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default HistorialPedidos;
