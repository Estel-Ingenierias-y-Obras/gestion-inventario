import { useCallback, useEffect, useState } from 'react';
import BackToConfiguration from '../components/BackToConfiguration';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createDepartment, deleteDepartment, getDepartments } from '../services/api';

function DepartamentosConfiguracion() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDepartments();
      setDepartments(response.data?.data || []);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudieron cargar los departamentos.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  const closeAdd = () => {
    if (saving) return;
    setAddOpen(false);
    setName('');
    setNameError('');
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setNameError('Introduce un nombre de entre 2 y 100 caracteres.');
      return;
    }
    if (departments.some((department) => department.name.localeCompare(trimmedName, 'es', { sensitivity: 'base' }) === 0)) {
      setNameError('Ya existe un departamento con este nombre.');
      return;
    }

    setSaving(true);
    try {
      await createDepartment({ name: trimmedName });
      setAddOpen(false);
      setName('');
      setNameError('');
      await loadDepartments();
      setToast({ type: 'success', message: 'Departamento creado correctamente.' });
    } catch (error) {
      const message = error?.response?.data?.message || 'No se pudo crear el departamento.';
      if (error?.response?.status === 409) setNameError(message);
      setToast({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteDepartment(deleteTarget._id);
      setDeleteTarget(null);
      await loadDepartments();
      setToast({ type: 'success', message: 'Departamento eliminado correctamente.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo eliminar el departamento.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Departamentos" subtitle="Gestiona las opciones disponibles al registrar nuevas entregas" actions={<button className="button button--primary" type="button" onClick={() => setAddOpen(true)}>+ Nuevo departamento</button>}>
      <BackToConfiguration />
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Departamentos registrados</h2><p>{departments.length} {departments.length === 1 ? 'departamento' : 'departamentos'}</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={5} /></div> : departments.length === 0 ? <div className="empty-state"><strong>No hay departamentos registrados.</strong><p>Añade un departamento para utilizarlo en nuevas entregas.</p></div> : <div className="table-scroll"><table className="data-table department-table"><thead><tr><th>Departamento</th><th>Fecha creación</th><th className="actions-column">Acciones</th></tr></thead><tbody>{departments.map((department) => <tr key={department._id}><td><strong>{department.name}</strong></td><td>{new Date(department.createdAt).toLocaleDateString('es-ES')}</td><td className="actions-column"><button className="icon-button icon-button--delete" type="button" onClick={() => setDeleteTarget(department)} aria-label={`Eliminar departamento ${department.name}`} title="Eliminar">🗑</button></td></tr>)}</tbody></table></div>}
      </section>

      {addOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeAdd(); }}><form className="dialog-card" onSubmit={handleAdd} role="dialog" aria-modal="true" aria-labelledby="add-department-title" noValidate><h2 id="add-department-title">Nuevo departamento</h2><p>Añade una opción para las futuras entregas.</p><label className="field"><span>Nombre del departamento</span><input autoFocus value={name} onChange={(event) => { setName(event.target.value); setNameError(''); }} className={nameError ? 'field__input--error' : ''} maxLength={100} />{nameError ? <small>{nameError}</small> : null}</label><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={closeAdd} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div></form></div> : null}

      {deleteTarget ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setDeleteTarget(null); }}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="delete-department-title"><div className="confirm-modal__icon" aria-hidden="true">!</div><h2 id="delete-department-title">Eliminar departamento</h2><p>¿Deseas eliminar este departamento?</p><div className="confirm-modal__summary"><strong>{deleteTarget.name}</strong><span>Las entregas históricas conservarán este nombre.</span></div><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button><button className="button button--danger" type="button" onClick={handleDelete} disabled={saving}>{saving ? 'Eliminando…' : 'Eliminar'}</button></div></section></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default DepartamentosConfiguracion;
