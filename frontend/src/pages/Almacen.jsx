import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { useAccess } from '../context/AccessContext';
import {
  deleteMaterialOrder, getMaterialOrders, markMaterialOrderReceived, updateMaterialOrder,
} from '../services/api';

const emptyForm = { material: '', modelo: '', cantidad: '', numeroPedido: '', recibido: false };
const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function Almacen() {
  const { isAdmin } = useAccess();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editErrors, setEditErrors] = useState({});
  const [confirmingEdit, setConfirmingEdit] = useState(false);
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

  useEffect(() => {
    if (!editTarget && !deleteTarget) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || busyId) return;
      if (confirmingEdit) setConfirmingEdit(false);
      else if (editTarget) setEditTarget(null);
      else setDeleteTarget(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busyId, confirmingEdit, deleteTarget, editTarget]);

  const filteredOrders = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return orders;
    return orders.filter((order) => [
      order.numeroPedido, order.material, order.modelo, order.proveedor,
    ].some((value) => normalizeSearch(value).includes(query)));
  }, [orders, search]);

  const openEdit = (order) => {
    if (busyId) return;
    setEditTarget(order);
    setEditForm({
      material: order.material || '', modelo: order.modelo || '',
      cantidad: String(order.cantidadInicial ?? ''), numeroPedido: order.numeroPedido || '',
      recibido: Boolean(order.recibido),
    });
    setEditErrors({});
    setConfirmingEdit(false);
  };

  const closeEdit = () => {
    if (busyId) return;
    setEditTarget(null);
    setEditForm(emptyForm);
    setEditErrors({});
    setConfirmingEdit(false);
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    setEditErrors((current) => ({ ...current, [field]: '' }));
  };

  const updateEditQuantity = (value) => {
    if (/^\d*$/.test(value)) updateEditField('cantidad', value);
  };

  const requestEditConfirmation = (event) => {
    event.preventDefault();
    const errors = {};
    if (editForm.material.trim().length < 2) errors.material = 'Introduce un material válido.';
    if (!editForm.modelo.trim()) errors.modelo = 'El modelo es obligatorio.';
    if (!Number.isInteger(Number(editForm.cantidad)) || Number(editForm.cantidad) < 1) errors.cantidad = 'La cantidad debe ser un número entero mayor que cero.';
    if (!editForm.numeroPedido.trim()) errors.numeroPedido = 'El número de pedido es obligatorio.';
    setEditErrors(errors);
    if (Object.keys(errors).length === 0) setConfirmingEdit(true);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setBusyId(editTarget._id);
    try {
      await updateMaterialOrder(editTarget._id, {
        material: editForm.material.trim(), modelo: editForm.modelo.trim(),
        cantidadInicial: Number(editForm.cantidad), numeroPedido: editForm.numeroPedido.trim(),
        recibido: editForm.recibido,
      });
      setEditTarget(null);
      setEditForm(emptyForm);
      setEditErrors({});
      setConfirmingEdit(false);
      await loadOrders();
      setToast({ type: 'success', message: 'Pedido actualizado correctamente' });
    } catch (error) {
      setConfirmingEdit(false);
      setToast({ type: 'error', message: error?.response?.data?.message || 'Error al actualizar el pedido' });
    } finally {
      setBusyId(null);
    }
  };

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

  const actionClick = (event, action) => {
    event.stopPropagation();
    action();
  };

  return (
    <PageShell
      title="Almacén"
      subtitle="Stock disponible y pedidos pendientes de recepción"
      actions={(
        <div className="warehouse-page-actions">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pedido, material, modelo, proveedor…" aria-label="Buscar pedidos de almacén" />
            {search ? <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button> : null}
          </div>
          <div className="page-action-group"><Link className="button button--secondary" to="/almacen/historial">Ver historial de pedidos</Link><Link className="button button--primary" to="/registro-material">+ Registrar material</Link></div>
        </div>
      )}
    >
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Pedidos activos</h2><p>{filteredOrders.length} {filteredOrders.length === 1 ? 'pedido encontrado' : 'pedidos encontrados'}</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={6} /></div> : filteredOrders.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">⌕</span><strong>Sin resultados</strong><p>{search ? 'No hay pedidos que coincidan con la búsqueda.' : 'Registra una compra para comenzar.'}</p></div> : (
          <div className="table-scroll"><table className="data-table warehouse-table"><thead><tr><th>N.º pedido</th><th>Material</th><th>Modelo</th><th>Inicial</th><th>Disponible</th><th>Fecha creación</th><th>Recepción</th><th className="actions-column">Acciones</th></tr></thead><tbody>{filteredOrders.map((order) => (
            <tr key={order._id} className="warehouse-table__editable-row" role="button" tabIndex="0" aria-label={`Editar pedido ${order.numeroPedido}`} onClick={() => openEdit(order)} onKeyDown={(event) => {
              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openEdit(order); }
            }}><td><strong>{order.numeroPedido}</strong></td><td>{order.material}</td><td>{order.modelo}</td><td>{order.cantidadInicial}</td><td><strong>{order.cantidadDisponible}</strong></td><td>{new Date(order.createdAt).toLocaleDateString('es-ES')}</td><td><span className={`warehouse-status warehouse-status--${order.recibido ? 'received' : 'pending'}`}>{order.recibido ? '● Recibido' : '● Pendiente recepción'}</span></td><td className="actions-column"><div className="table-actions">{!order.recibido ? <button className="button button--secondary button--compact" type="button" onClick={(event) => actionClick(event, () => markReceived(order))} disabled={busyId === order._id}>{busyId === order._id ? 'Actualizando…' : 'Marcar recibido'}</button> : null}{isAdmin ? <button className="icon-button icon-button--delete" type="button" onClick={(event) => actionClick(event, () => setDeleteTarget(order))} disabled={busyId === order._id} aria-label={`Eliminar pedido ${order.numeroPedido}`} title="Eliminar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2v7h2v-7h-2Zm4 0v7h2v-7h-2Z" /></svg></button> : null}</div></td></tr>
          ))}</tbody></table></div>
        )}
      </section>

      {editTarget && !confirmingEdit ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEdit(); }}><form className="dialog-card warehouse-edit-dialog" onSubmit={requestEditConfirmation} role="dialog" aria-modal="true" aria-labelledby="edit-order-title" noValidate>
        <h2 id="edit-order-title">Editar pedido</h2><p>Actualiza los datos actuales del pedido de almacén.</p>
        <label className="field"><span>Material</span><input autoFocus value={editForm.material} onChange={(event) => updateEditField('material', event.target.value)} className={editErrors.material ? 'field__input--error' : ''} maxLength={100} />{editErrors.material ? <small>{editErrors.material}</small> : null}</label>
        <label className="field"><span>Modelo</span><input value={editForm.modelo} onChange={(event) => updateEditField('modelo', event.target.value)} className={editErrors.modelo ? 'field__input--error' : ''} maxLength={100} />{editErrors.modelo ? <small>{editErrors.modelo}</small> : null}</label>
        <label className="field"><span>Cantidad</span><input type="number" min="1" step="1" value={editForm.cantidad} onChange={(event) => updateEditQuantity(event.target.value)} className={editErrors.cantidad ? 'field__input--error' : ''} />{editErrors.cantidad ? <small>{editErrors.cantidad}</small> : null}</label>
        <label className="field"><span>Número de pedido</span><input value={editForm.numeroPedido} onChange={(event) => updateEditField('numeroPedido', event.target.value)} className={editErrors.numeroPedido ? 'field__input--error' : ''} maxLength={100} />{editErrors.numeroPedido ? <small>{editErrors.numeroPedido}</small> : null}</label>
        <label className="field"><span>Estado de recepción</span><select value={editForm.recibido ? 'received' : 'pending'} onChange={(event) => updateEditField('recibido', event.target.value === 'received')}><option value="pending">No recibido</option><option value="received">Recibido</option></select></label>
        <div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={closeEdit}>Cancelar</button><button className="button button--primary" type="submit">Guardar</button></div>
      </form></div> : null}

      {editTarget && confirmingEdit ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) setConfirmingEdit(false); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-edit-title">
        <div className="confirm-modal__icon confirm-modal__icon--neutral" aria-hidden="true">?</div>
        <div className="confirm-modal__content"><h2 id="confirm-edit-title">¿Deseas guardar los cambios realizados en este pedido?</h2><div className="confirm-modal__summary"><strong>{editForm.numeroPedido}</strong><span>{editForm.material} · {editForm.modelo} · {editForm.cantidad} unidades</span></div></div>
        <div className="confirm-modal__actions"><button className="button button--secondary" type="button" onClick={() => setConfirmingEdit(false)} disabled={busyId === editTarget._id}>Cancelar</button><button className="button button--primary" type="button" onClick={saveEdit} disabled={busyId === editTarget._id}>{busyId === editTarget._id ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </section></div> : null}

      {deleteTarget ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyId) setDeleteTarget(null); }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-order-title" aria-describedby="delete-order-description">
        <div className="confirm-modal__icon" aria-hidden="true">!</div>
        <div className="confirm-modal__content"><h2 id="delete-order-title">¿Deseas eliminar este pedido?</h2><p id="delete-order-description">Esta acción no se puede deshacer.</p><div className="confirm-modal__summary"><strong>{deleteTarget.numeroPedido}</strong><span>{deleteTarget.material} · {deleteTarget.modelo} · {deleteTarget.cantidadDisponible} unidades restantes</span></div></div>
        <div className="confirm-modal__actions"><button className="button button--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={busyId === deleteTarget._id}>Cancelar</button><button className="button button--danger" type="button" onClick={handleDelete} disabled={busyId === deleteTarget._id}>{busyId === deleteTarget._id ? 'Eliminando…' : 'Eliminar'}</button></div>
      </section></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default Almacen;
