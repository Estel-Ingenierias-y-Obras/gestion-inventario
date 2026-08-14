import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { getMaterialOrderHistory } from '../services/api';

function HistorialPedidos() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <PageShell title="Historial de pedidos" subtitle="Pedidos agotados mediante el consumo de entregas" actions={<Link className="button button--secondary" to="/almacen">Volver a almacén</Link>}>
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Pedidos agotados</h2><p>{orders.length} pedidos completados</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={6} /></div> : orders.length === 0 ? <div className="empty-state"><strong>No hay pedidos agotados.</strong></div> : (
          <div className="table-scroll"><table className="data-table warehouse-history-table"><thead><tr><th>N.º pedido</th><th>Material</th><th>Modelo</th><th>Cantidad inicial</th><th>Fecha creación</th><th>Fecha agotado</th></tr></thead><tbody>{orders.map((order) => (
            <tr key={order._id}><td><strong>{order.numeroPedido}</strong></td><td>{order.material}</td><td>{order.modelo}</td><td>{order.cantidadInicial}</td><td>{new Date(order.createdAt).toLocaleDateString('es-ES')}</td><td>{order.agotadoAt ? new Date(order.agotadoAt).toLocaleString('es-ES') : '—'}</td></tr>
          ))}</tbody></table></div>
        )}
      </section>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default HistorialPedidos;
