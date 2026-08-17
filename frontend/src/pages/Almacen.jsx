import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { useAccess } from '../context/AccessContext';
import { deleteMaterialOrder, getMaterialOrders, markMaterialOrderReceived } from '../services/api';

function Almacen() {
  const { isAdmin } = useAccess();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMaterialOrders();
      setOrders(response.data?.data || []);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el almacén.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const markReceived = async (order) => {
    setBusyId(order._id);
    try {
      await markMaterialOrderReceived(order._id);
      await loadOrders();
      setToast({ type: 'success', message: 'Material marcado como recibido.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo actualizar la recepción.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    try {
      await deleteMaterialOrder(deleteTarget._id);
      setDeleteTarget(null);
      await loadOrders();
      setToast({ type: 'success', message: 'Pedido eliminado correctamente' });
    } catch {
      setToast({ type: 'error', message: 'Error al eliminar el pedido' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell title="Almacén" subtitle="Stock disponible y pedidos pendientes de recepción" actions={<div className="page-action-group"><Link className="button button--secondary" to="/almacen/historial">Ver historial de pedidos</Link><Link className="button button--primary" to="/registro-material">+ Registrar material</Link></div>}>
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Pedidos activos</h2><p>{orders.length} pedidos en almacén</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={6} /></div> : orders.length === 0 ? <div className="empty-state"><strong>No hay pedidos activos.</strong><p>Registra una compra para comenzar.</p></div> : (
          <div className="table-scroll"><table className="data-table warehouse-table"><thead><tr><th>N.º pedido</th><th>Material</th><th>Modelo</th><th>Inicial</th><th>Disponible</th><th>Fecha creación</th><th>Recepción</th><th className="actions-column">Acciones</th></tr></thead><tbody>{orders.map((order) => (
            <tr key={order._id}><td><strong>{order.numeroPedido}</strong></td><td>{order.material}</td><td>{order.modelo}</td><td>{order.cantidadInicial}</td><td><strong>{order.cantidadDisponible}</strong></td><td>{new Date(order.createdAt).toLocaleDateString('es-ES')}</td><td><span className={`warehouse-status warehouse-status--${order.recibido ? 'received' : 'pending'}`}>{order.recibido ? '● Recibido' : '● Pendiente recepción'}</span></td><td className="actions-column"><div className="table-actions">{!order.recibido ? <button className="button button--secondary button--compact" type="button" onClick={() => markReceived(order)} disabled={busyId === order._id}>{busyId === order._id ? 'Actualizando…' : 'Marcar recibido'}</button> : null}{isAdmin ? <button className="icon-button icon-button--delete" type="button" onClick={() => setDeleteTarget(order)} disabled={busyId === order._id} aria-label={`Eliminar pedido ${order.numeroPedido}`} title="Eliminar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg></button> : null}</div></td></tr>
          ))}</tbody></table></div>
        )}
      </section>
      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) setDeleteTarget(null); }}>
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-order-title" aria-describedby="delete-order-description">
            <div className="confirm-modal__icon" aria-hidden="true">!</div>
            <div className="confirm-modal__content"><h2 id="delete-order-title">¿Deseas eliminar este pedido?</h2><p id="delete-order-description">Esta acción no se puede deshacer.</p><div className="confirm-modal__summary"><strong>{deleteTarget.numeroPedido}</strong><span>{deleteTarget.material} · {deleteTarget.modelo} · {deleteTarget.cantidadDisponible} unidades restantes</span></div></div>
            <div className="confirm-modal__actions"><button className="button button--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={busyId === deleteTarget._id}>Cancelar</button><button className="button button--danger" type="button" onClick={handleDelete} disabled={busyId === deleteTarget._id}>{busyId === deleteTarget._id ? 'Eliminando…' : 'Eliminar'}</button></div>
          </section>
        </div>
      ) : null}
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default Almacen;
