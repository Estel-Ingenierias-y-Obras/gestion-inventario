import { useCallback, useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import LoadingState from '../components/LoadingState';
import Toast from '../components/Toast';
import { addWhitelistUser, deleteWhitelistUser, getWhitelistUsers } from '../services/api';

const emptyForm = { name: '', email: '' };

function UsuariosConfiguracion() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try { const response = await getWhitelistUsers(); setUsers(response.data?.data || []); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar la whitelist.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const closeAdd = () => { if (!saving) { setAddOpen(false); setForm(emptyForm); setErrors({}); } };
  const handleAdd = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = 'Introduce un nombre válido.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Introduce un correo electrónico válido.';
    if (users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) nextErrors.email = 'Este correo electrónico ya está autorizado.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      await addWhitelistUser({ name: form.name.trim(), email: form.email.trim() });
      setAddOpen(false); setForm(emptyForm); setErrors({}); await loadUsers();
      setToast({ type: 'success', message: 'Usuario añadido correctamente' });
    } catch (error) {
      setErrors(error?.response?.status === 409 ? { email: error.response.data.message } : {});
      setToast({ type: 'error', message: 'Error al guardar usuario' });
    } finally { setSaving(false); }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isPrimaryAdmin) { setDeleteTarget(null); setToast({ type: 'error', message: 'No se puede eliminar el administrador principal' }); return; }
    setSaving(true);
    try { await deleteWhitelistUser(deleteTarget._id); setDeleteTarget(null); await loadUsers(); setToast({ type: 'success', message: 'Usuario eliminado correctamente' }); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'Error al eliminar usuario' }); }
    finally { setSaving(false); }
  };

  return (
    <PageShell title="Usuarios" subtitle="Gestión de usuarios autorizados para acceder a la aplicación" actions={<button className="button button--primary" type="button" onClick={() => setAddOpen(true)}>+ Añadir usuario</button>}>
      <section className="panel"><div className="panel__header panel__header--compact"><div><h2>Whitelist</h2><p>{users.length} usuarios autorizados</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={5} /></div> : <div className="table-scroll"><table className="data-table whitelist-table"><thead><tr><th>Nombre</th><th>Email</th><th>Fecha alta</th><th className="actions-column">Acciones</th></tr></thead><tbody>{users.map((user) => <tr key={user._id}><td><strong>{user.name}</strong>{user.isPrimaryAdmin ? <span className="table-secondary">Administrador principal</span> : null}</td><td>{user.email}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td className="actions-column"><button className="icon-button icon-button--delete" type="button" disabled={user.isPrimaryAdmin} onClick={() => user.isPrimaryAdmin ? setToast({ type: 'error', message: 'No se puede eliminar el administrador principal' }) : setDeleteTarget(user)} aria-label={`Eliminar a ${user.name}`} title={user.isPrimaryAdmin ? 'El administrador principal no puede eliminarse' : 'Eliminar'}>🗑</button></td></tr>)}</tbody></table></div>}
      </section>
      {addOpen ? <div className="modal-backdrop" role="presentation"><form className="dialog-card" onSubmit={handleAdd} role="dialog" aria-modal="true" aria-labelledby="add-user-title"><h2 id="add-user-title">Añadir usuario</h2><p>Autoriza una cuenta de Microsoft para acceder.</p><label className="field"><span>Nombre</span><input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={errors.name ? 'field__input--error' : ''} />{errors.name ? <small>{errors.name}</small> : null}</label><label className="field"><span>Correo electrónico</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={errors.email ? 'field__input--error' : ''} />{errors.email ? <small>{errors.email}</small> : null}</label><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={closeAdd} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div></form></div> : null}
      {deleteTarget ? <div className="modal-backdrop" role="presentation"><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="delete-user-title"><div className="confirm-modal__icon">!</div><h2 id="delete-user-title">Eliminar usuario</h2><p>¿Está seguro de que desea eliminar este usuario de la whitelist?</p><p className="dialog-card__warning">Perderá acceso inmediatamente a la aplicación.</p><div className="confirm-modal__summary"><strong>{deleteTarget.name}</strong><span>{deleteTarget.email}</span></div><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button><button className="button button--danger" type="button" onClick={handleDelete} disabled={saving}>{saving ? 'Eliminando…' : 'Eliminar'}</button></div></section></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default UsuariosConfiguracion;
