import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { getMaterialOrders, markMaterialOrderReceived } from '../services/api';

function Almacen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
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

  return (
    <PageShell title="Almacén" subtitle="Stock disponible y pedidos pendientes de recepción" actions={<div className="page-action-group"><Link className="button button--secondary" to="/almacen/historial">Ver historial de pedidos</Link><Link className="button button--primary" to="/registro-material">+ Registrar material</Link></div>}>
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Pedidos activos</h2><p>{orders.length} pedidos en almacén</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={6} /></div> : orders.length === 0 ? <div className="empty-state"><strong>No hay pedidos activos.</strong><p>Registra una compra para comenzar.</p></div> : (
          <div className="table-scroll"><table className="data-table warehouse-table"><thead><tr><th>N.º pedido</th><th>Material</th><th>Modelo</th><th>Inicial</th><th>Disponible</th><th>Fecha creación</th><th>Recepción</th><th className="actions-column">Acciones</th></tr></thead><tbody>{orders.map((order) => (
            <tr key={order._id}><td><strong>{order.numeroPedido}</strong></td><td>{order.material}</td><td>{order.modelo}</td><td>{order.cantidadInicial}</td><td><strong>{order.cantidadDisponible}</strong></td><td>{new Date(order.createdAt).toLocaleDateString('es-ES')}</td><td><span className={`warehouse-status warehouse-status--${order.recibido ? 'received' : 'pending'}`}>{order.recibido ? '● Recibido' : '● Pendiente recepción'}</span></td><td className="actions-column">{!order.recibido ? <button className="button button--secondary button--compact" type="button" onClick={() => markReceived(order)} disabled={busyId === order._id}>{busyId === order._id ? 'Actualizando…' : 'Marcar recibido'}</button> : '—'}</td></tr>
          ))}</tbody></table></div>
        )}
      </section>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default Almacen;
