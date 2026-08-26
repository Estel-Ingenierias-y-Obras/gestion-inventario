import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import SortableHeader from '../components/SortableHeader';
import Toast from '../components/Toast';
import { nextSortConfig, sortRows } from '../utils/tableSort';
import {
  assignPersonMaterial, createPerson, deletePerson, getDepartmentPeople, getPersonMaterials,
  removePersonMaterial, updatePerson, updatePersonMaterialSerial,
  undoPersonMaterialAssignment,
} from '../services/api';

const emptyAssignment = { origen: 'manual', material: '', modelo: '', cantidad: 1, numeroSerie: '' };
const date = (value) => new Date(value).toLocaleDateString('es-ES');
const requiresSerial = (material) => {
  const value = material.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  return value.includes('portatil') || value.includes('laptop');
};

function DepartamentoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'nombreCompleto', direction: 'asc' });
  const [personForm, setPersonForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState(null);
  const [serialEdit, setSerialEdit] = useState(null);
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [undoTarget, setUndoTarget] = useState(null);
  const [toast, setToast] = useState(null);

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDepartmentPeople(id);
      setDepartment(response.data.department);
      setPeople(response.data.data || []);
    } catch (error) {
      if (error?.response?.status === 404) navigate('/configuracion/departamentos', { replace: true });
      else setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el departamento.' });
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { loadPeople(); }, [loadPeople]);

  const visiblePeople = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('es');
    const filtered = needle ? people.filter((person) => person.nombreCompleto.toLocaleLowerCase('es').includes(needle)) : people;
    return sortRows(filtered, sort, { createdAt: 'date', materialAsignado: 'number' });
  }, [people, search, sort]);

  const savePerson = async (event) => {
    event.preventDefault();
    const name = personForm.nombreCompleto.trim();
    if (name.length < 2) return;
    setSaving(true);
    try {
      if (personForm._id) await updatePerson(personForm._id, { nombreCompleto: name });
      else await createPerson(id, { nombreCompleto: name });
      setPersonForm(null); await loadPeople();
      setToast({ type: 'success', message: personForm._id ? 'Persona actualizada.' : 'Persona creada correctamente.' });
    } catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo guardar la persona.' }); }
    finally { setSaving(false); }
  };

  const openMaterials = async (person) => {
    setSelectedPerson(person); setMaterialsLoading(true);
    try { const response = await getPersonMaterials(person._id); setAssignments(response.data.data || []); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el material.' }); }
    finally { setMaterialsLoading(false); }
  };

  const handlePersonRowKeyDown = (event, person) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openMaterials(person);
  };

  const refreshMaterials = async () => {
    const response = await getPersonMaterials(selectedPerson._id);
    setAssignments(response.data.data || []);
    await loadPeople();
  };

  const openAssignment = () => setAssignmentForm({ ...emptyAssignment });

  const saveAssignment = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await assignPersonMaterial(selectedPerson._id, { ...assignmentForm, cantidad: Number(assignmentForm.cantidad) });
      setAssignmentForm(null); await refreshMaterials();
      setToast({ type: 'success', message: 'Material asignado correctamente.' });
    } catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo asignar el material.' }); }
    finally { setSaving(false); }
  };

  const saveSerial = async (event) => {
    event.preventDefault(); setSaving(true);
    try { await updatePersonMaterialSerial(selectedPerson._id, serialEdit._id, serialEdit.numeroSerie); setSerialEdit(null); await refreshMaterials(); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo editar el número de serie.' }); }
    finally { setSaving(false); }
  };

  const handleUnassign = async () => {
    if (!unassignTarget) return;
    setSaving(true);
    try {
      await removePersonMaterial(selectedPerson._id, unassignTarget._id);
      setUnassignTarget(null);
      await refreshMaterials();
      setToast({ type: 'success', message: 'Material desasignado y devuelto al almacén correctamente.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo desasignar el material.' });
    } finally { setSaving(false); }
  };

  const handleUndo = async () => {
    if (!undoTarget) return;
    setSaving(true);
    try {
      await undoPersonMaterialAssignment(selectedPerson._id, undoTarget._id);
      setUndoTarget(null);
      await refreshMaterials();
      setToast({ type: 'success', message: 'Asignación deshecha y material devuelto al almacén.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo deshacer la asignación.' });
    } finally { setSaving(false); }
  };

  return (
    <PageShell title={department?.name || 'Departamento'} subtitle="Personas del departamento" actions={<button className="button button--primary" type="button" onClick={() => setPersonForm({ nombreCompleto: '' })}>+ Nueva persona</button>}>
      <Link className="back-to-configuration" to="/configuracion/departamentos">← <span>Volver a departamentos</span></Link>
      <section className="panel">
        <div className="panel__header department-people-toolbar"><div><h2>Personas del departamento</h2><p>{people.length} {people.length === 1 ? 'persona' : 'personas'}</p></div><label className="search-box"><span className="search-box__icon">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona" /></label></div>
        {loading ? <div className="panel__body"><LoadingState rows={5} /></div> : visiblePeople.length === 0 ? <div className="empty-state"><strong>No hay personas que mostrar.</strong><p>Añade una persona o cambia la búsqueda.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><SortableHeader label="Nombre" sortKey="nombreCompleto" sortConfig={sort} onSort={(key) => setSort(nextSortConfig(sort, key))} /><SortableHeader label="Fecha creación" sortKey="createdAt" sortConfig={sort} onSort={(key) => setSort(nextSortConfig(sort, key))} /><SortableHeader label="Material asignado" sortKey="materialAsignado" sortConfig={sort} onSort={(key) => setSort(nextSortConfig(sort, key))} /><th>Acciones</th></tr></thead><tbody>{visiblePeople.map((person) => <tr className="clickable-table-row" key={person._id} tabIndex={0} role="button" aria-label={`Abrir material asignado de ${person.nombreCompleto}`} onClick={() => openMaterials(person)} onKeyDown={(event) => handlePersonRowKeyDown(event, person)}><td><strong>{person.nombreCompleto}</strong></td><td>{date(person.createdAt)}</td><td>{person.materialAsignado}</td><td><div className="row-actions"><button className="icon-button icon-button--edit" type="button" title="Editar" onKeyDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setPersonForm(person); }}>✎</button><button className="icon-button icon-button--delete" type="button" title="Eliminar" onKeyDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setDeleteTarget(person); }}>🗑</button></div></td></tr>)}</tbody></table></div>}
      </section>

      {personForm ? <div className="modal-backdrop"><form className="dialog-card" onSubmit={savePerson}><h2>{personForm._id ? 'Editar persona' : 'Nueva persona'}</h2><label className="field"><span>Nombre completo</span><input autoFocus required minLength={2} maxLength={150} value={personForm.nombreCompleto} onChange={(event) => setPersonForm({ ...personForm, nombreCompleto: event.target.value })} /></label><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setPersonForm(null)} disabled={saving}>Cancelar</button><button className="button button--primary" disabled={saving}>Guardar</button></div></form></div> : null}

      {deleteTarget ? <div className="modal-backdrop"><section className="dialog-card"><h2>Eliminar persona</h2><p>La persona dejará de estar activa, pero conservará su historial individual.</p><strong>{deleteTarget.nombreCompleto}</strong><div className="dialog-card__actions"><button className="button button--secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button><button className="button button--danger" disabled={saving} onClick={async () => { setSaving(true); try { await deletePerson(deleteTarget._id); setDeleteTarget(null); await loadPeople(); } catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo eliminar.' }); } finally { setSaving(false); } }}>Eliminar</button></div></section></div> : null}

      {selectedPerson ? <div className="modal-backdrop"><section className="dialog-card person-material-dialog"><div className="material-dialog-heading"><div><h2>Gestión de material asignado</h2><p>{selectedPerson.nombreCompleto}</p></div><button className="button button--primary" type="button" onClick={openAssignment} disabled={saving}>+ Asignar material</button></div>{materialsLoading ? <LoadingState rows={4} /> : <div className="table-scroll"><table className="data-table material-history-table"><thead><tr><th>Material</th><th>Modelo</th><th>Cantidad</th><th>Número serie</th><th>Número pedido</th><th>Fecha asignación</th><th>Acciones</th></tr></thead><tbody>{assignments.map((item) => <tr key={item._id} className={item.removed ? 'assignment-removed' : ''}><td>{item.material}</td><td>{item.modelo}</td><td>{item.cantidad}</td><td>{item.numeroSerie || '-'}</td><td>{item.numeroPedido || '-'}</td><td>{date(item.assignedAt)}</td><td>{!item.removed ? <div className="row-actions"><button className="icon-button icon-button--edit" type="button" title="Editar serie" onClick={() => setSerialEdit({ ...item, numeroSerie: item.numeroSerie || '' })}>✎</button><button className="icon-button icon-button--restore" type="button" title="Desasignar" aria-label={`Desasignar ${item.material} de ${selectedPerson.nombreCompleto}`} onClick={() => setUnassignTarget(item)}>↩</button><button className="icon-button icon-button--delete" type="button" title="Deshacer asignación" aria-label={`Deshacer asignación de ${item.material} a ${selectedPerson.nombreCompleto}`} onClick={() => setUndoTarget(item)}>✕</button></div> : '-'}</td></tr>)}</tbody></table>{assignments.length === 0 ? <div className="empty-state"><p>No hay material asignado.</p></div> : null}</div>}<div className="dialog-card__actions"><button className="button button--secondary" onClick={() => setSelectedPerson(null)}>Cerrar</button></div></section></div> : null}

      {assignmentForm ? <div className="modal-backdrop modal-backdrop--nested"><form className="dialog-card" onSubmit={saveAssignment}><h2>Añadir material manual</h2><p>Este material no está relacionado con el almacén ni con pedidos de compra.</p><label className="field"><span>Material</span><input required minLength={2} maxLength={100} value={assignmentForm.material} onChange={(event) => setAssignmentForm({ ...assignmentForm, material: event.target.value })} placeholder="Mochila, llaves, tarjeta de acceso…" /></label><label className="field"><span>Modelo</span><input required maxLength={100} value={assignmentForm.modelo} onChange={(event) => setAssignmentForm({ ...assignmentForm, modelo: event.target.value })} /></label><label className="field"><span>Cantidad</span><input type="number" min="1" max="10000" required value={assignmentForm.cantidad} onChange={(event) => setAssignmentForm({ ...assignmentForm, cantidad: event.target.value })} /></label><label className="field"><span>Número de serie {requiresSerial(assignmentForm.material) ? '(obligatorio)' : '(opcional)'}</span><input required={requiresSerial(assignmentForm.material)} maxLength={150} value={assignmentForm.numeroSerie} onChange={(event) => setAssignmentForm({ ...assignmentForm, numeroSerie: event.target.value })} /></label><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setAssignmentForm(null)}>Cancelar</button><button className="button button--primary" disabled={saving}>Añadir</button></div></form></div> : null}

      {serialEdit ? <div className="modal-backdrop modal-backdrop--nested"><form className="dialog-card" onSubmit={saveSerial}><h2>Editar número de serie</h2><p>{serialEdit.material} · {serialEdit.modelo}</p><label className="field"><span>Número de serie {requiresSerial(serialEdit.material) ? '(obligatorio)' : '(opcional)'}</span><input autoFocus required={requiresSerial(serialEdit.material)} maxLength={150} value={serialEdit.numeroSerie} onChange={(event) => setSerialEdit({ ...serialEdit, numeroSerie: event.target.value })} /></label><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setSerialEdit(null)}>Cancelar</button><button className="button button--primary" disabled={saving}>Guardar</button></div></form></div> : null}
      {unassignTarget ? <div className="modal-backdrop modal-backdrop--nested" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setUnassignTarget(null); }}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="unassign-material-title"><div className="confirm-modal__icon confirm-modal__icon--neutral" aria-hidden="true">↩</div><h2 id="unassign-material-title">¿Deseas desasignar este material?</h2><p>El material volverá al almacén y dejará de estar asociado a esta persona.</p><div className="confirm-modal__summary"><strong>{unassignTarget.material} · {unassignTarget.modelo}</strong><span>{unassignTarget.numeroSerie || 'Sin número de serie'} · Pedido: {unassignTarget.numeroPedido || '-'} · Cantidad: {unassignTarget.cantidad}</span></div><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setUnassignTarget(null)} disabled={saving}>Cancelar</button><button className="button button--primary" type="button" onClick={handleUnassign} disabled={saving}>{saving ? 'Desasignando…' : 'Desasignar'}</button></div></section></div> : null}
      {undoTarget ? <div className="modal-backdrop modal-backdrop--nested" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setUndoTarget(null); }}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="undo-assignment-title"><div className="confirm-modal__icon" aria-hidden="true">✕</div><h2 id="undo-assignment-title">Deshacer asignación</h2><p>¿Deseas deshacer esta asignación?</p><p>El material volverá al almacén y esta asignación se tratará como si nunca hubiera existido.</p><div className="confirm-modal__summary"><strong>{undoTarget.material} · {undoTarget.modelo}</strong><span>{undoTarget.numeroSerie || 'Sin número de serie'} · Cantidad: {undoTarget.cantidad}</span></div><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setUndoTarget(null)} disabled={saving}>Cancelar</button><button className="button button--danger" type="button" onClick={handleUndo} disabled={saving}>{saving ? 'Deshaciendo…' : 'Deshacer'}</button></div></section></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </PageShell>
  );
}

export default DepartamentoDetalle;
