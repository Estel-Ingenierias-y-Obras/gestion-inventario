import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import SortableHeader from '../components/SortableHeader';
import Toast from '../components/Toast';
import { useAccess } from '../context/AccessContext';
import { getMaterialOrderHistory, restoreMaterialOrder } from '../services/api';
import { nextSortConfig, sortRows } from '../utils/tableSort';

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const columnTypes = { cantidadInicial: 'number', createdAt: 'date', agotadoAt: 'date' };
const descendingByDefault = new Set(['cantidadInicial', 'createdAt', 'agotadoAt']);

function HistorialPedidos() {
  const { isAdmin } = useAccess();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'material', direction: 'asc' });
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreQuantity, setRestoreQuantity] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoring, setRestoring] = useState(false);
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
    const filtered = query ? orders.filter((order) => [
      order.numeroPedido, order.material, order.modelo,
    ].some((value) => normalizeSearch(value).includes(query))) : orders;
    return sortRows(filtered, sortConfig, columnTypes);
  }, [orders, search, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((current) => nextSortConfig(current, key, descendingByDefault.has(key) ? 'desc' : 'asc'));
  };

  const openRestore = (order) => {
    setRestoreTarget(order);
    setRestoreQuantity(String(order.cantidadInicial));
    setRestoreError('');
  };

  const closeRestore = () => {
    if (restoring) return;
    setRestoreTarget(null);
    setRestoreQuantity('');
    setRestoreError('');
  };

  const updateRestoreQuantity = (value) => {
    if (/^\d*$/.test(value)) {
      setRestoreQuantity(value);
      setRestoreError('');
    }
  };

  const handleRestore = async (event) => {
    event.preventDefault();
    const quantity = Number(restoreQuantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > restoreTarget.cantidadInicial) {
      setRestoreError(`Introduce una cantidad entera entre 1 y ${restoreTarget.cantidadInicial}.`);
      return;
    }

    setRestoring(true);
    try {
      await restoreMaterialOrder(restoreTarget._id, quantity);
      setOrders((current) => current.filter((order) => order._id !== restoreTarget._id));
      setRestoreTarget(null);
      setRestoreQuantity('');
      setToast({ type: 'success', message: `${quantity} ${quantity === 1 ? 'unidad restaurada' : 'unidades restauradas'} en el almacén.` });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo restaurar el pedido.' });
    } finally {
      setRestoring(false);
    }
  };

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
          <div className="table-scroll"><table className="data-table warehouse-history-table"><thead><tr><SortableHeader label="N.º pedido" sortKey="numeroPedido" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Material" sortKey="material" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Modelo" sortKey="modelo" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Cantidad inicial" sortKey="cantidadInicial" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Fecha creación" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Fecha agotado" sortKey="agotadoAt" sortConfig={sortConfig} onSort={handleSort} />{isAdmin ? <th className="actions-column">Acciones</th> : null}</tr></thead><tbody>{filteredOrders.map((order) => (
            <tr key={order._id}><td><strong>{order.numeroPedido}</strong></td><td>{order.material}</td><td>{order.modelo}</td><td>{order.cantidadInicial}</td><td>{new Date(order.createdAt).toLocaleDateString('es-ES')}</td><td>{order.agotadoAt ? new Date(order.agotadoAt).toLocaleString('es-ES') : '—'}</td>{isAdmin ? <td className="actions-column"><button className="icon-button icon-button--restore" type="button" onClick={() => openRestore(order)} aria-label={`Restaurar stock del pedido ${order.numeroPedido}`} title="Restaurar stock"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6M5.6 9.7A8 8 0 1 1 4 15" /></svg></button></td> : null}</tr>
          ))}</tbody></table></div>
        )}
      </section>
      {restoreTarget ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRestore(); }}><form className="dialog-card" onSubmit={handleRestore} role="dialog" aria-modal="true" aria-labelledby="restore-stock-title" noValidate>
        <h2 id="restore-stock-title">Restaurar stock</h2>
        <p>¿Cuántas unidades deseas devolver al almacén?</p>
        <div className="confirm-modal__summary"><strong>{restoreTarget.numeroPedido}</strong><span>{restoreTarget.material} · {restoreTarget.modelo} · Máximo {restoreTarget.cantidadInicial} unidades</span></div>
        <label className="field"><span>Cantidad</span><input autoFocus type="number" min="1" max={restoreTarget.cantidadInicial} step="1" value={restoreQuantity} onChange={(event) => updateRestoreQuantity(event.target.value)} className={restoreError ? 'field__input--error' : ''} />{restoreError ? <small>{restoreError}</small> : null}</label>
        <div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={closeRestore} disabled={restoring}>Cancelar</button><button className="button button--primary" type="submit" disabled={restoring}>{restoring ? 'Restaurando…' : 'Restaurar'}</button></div>
      </form></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default HistorialPedidos;
