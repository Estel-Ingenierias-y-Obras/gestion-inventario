import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToConfiguration from '../components/BackToConfiguration';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import SortableHeader from '../components/SortableHeader';
import Toast from '../components/Toast';
import {
  confirmEntraDeactivation, getDepartments, getPendingEntraDeactivations, synchronizeEntraCatalog,
} from '../services/api';
import { nextSortConfig, sortRows } from '../utils/tableSort';

function DepartamentosConfiguracion() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [pendingPeople, setPendingPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });

  const visibleDepartments = useMemo(() => sortRows(departments, sort, {
    employeeCount: 'number', materialCount: 'number',
  }), [departments, sort]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const [departmentsResponse, pendingResponse] = await Promise.all([
        getDepartments(), getPendingEntraDeactivations(),
      ]);
      setDepartments(departmentsResponse.data?.data || []);
      setPendingPeople(pendingResponse.data?.data || []);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudieron cargar los departamentos sincronizados.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDepartments(); }, [loadDepartments]);

  const synchronize = async () => {
    setSyncing(true);
    try {
      const response = await synchronizeEntraCatalog();
      await loadDepartments();
      setToast({ type: 'success', message: `Catálogo actualizado: ${response.data?.data?.eligibleUsers || 0} personas elegibles.` });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo sincronizar el catálogo Entra.' });
    } finally { setSyncing(false); }
  };

  const confirmDeactivation = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      const response = await confirmEntraDeactivation(confirmTarget._id);
      await loadDepartments();
      setConfirmTarget(null);
      setToast({ type: 'success', message: `Baja confirmada. ${response.data?.data?.returnedAssignments || 0} asignaciones devueltas al almacén.` });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo confirmar la baja.' });
    } finally { setConfirming(false); }
  };

  const openDepartment = (department) => navigate(`/departamentos/${department._id}`);
  const handleRowKeyDown = (event, department) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault(); openDepartment(department);
  };

  return (
    <PageShell title="Departamentos" subtitle="Departamentos y personas sincronizados desde Microsoft Entra ID" actions={<button className="button button--primary" type="button" onClick={synchronize} disabled={syncing}>{syncing ? 'Sincronizando…' : 'Sincronizar catálogo'}</button>}>
      <BackToConfiguration />
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Departamentos sincronizados</h2><p>{departments.length} {departments.length === 1 ? 'departamento visible' : 'departamentos visibles'}</p></div><span className="status-badge"><span />Fuente: Entra ID</span></div>
        {loading ? <div className="panel__body"><LoadingState rows={5} /></div> : departments.length === 0 ? <div className="empty-state"><strong>No hay departamentos sincronizados.</strong><p>Ejecuta la sincronización del catálogo para importar los usuarios elegibles.</p></div> : <div className="table-scroll"><table className="data-table department-table"><thead><tr><SortableHeader label="Departamento" sortKey="name" sortConfig={sort} onSort={(key) => setSort(nextSortConfig(sort, key))} /><SortableHeader label="Nº Empleados" sortKey="employeeCount" sortConfig={sort} onSort={(key) => setSort(nextSortConfig(sort, key))} /><SortableHeader label="Nº Material" sortKey="materialCount" sortConfig={sort} onSort={(key) => setSort(nextSortConfig(sort, key))} /></tr></thead><tbody>{visibleDepartments.map((department) => <tr className="clickable-table-row" key={department._id} tabIndex={0} role="link" onClick={() => openDepartment(department)} onKeyDown={(event) => handleRowKeyDown(event, department)}><td><strong>{department.name}</strong></td><td>{department.employeeCount}</td><td>{department.materialCount}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Bajas pendientes</h2><p>Usuarios que han dejado de cumplir los requisitos de Microsoft Entra ID.</p></div><span className="status-badge status-badge--warning">⚠ {pendingPeople.length} pendientes</span></div>
        {loading ? <div className="panel__body"><LoadingState rows={3} /></div> : pendingPeople.length === 0 ? <div className="empty-state"><strong>No hay bajas pendientes.</strong></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Persona</th><th>Departamento</th><th>Motivo</th><th>Material asignado</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{pendingPeople.map((person) => <tr key={person._id}><td><strong>{person.nombreCompleto}</strong></td><td>{person.departmentName || '—'}</td><td>{person.entraDeactivationReason || 'No elegible'}</td><td>{person.materialUnits} unidades ({person.assignmentCount} asignaciones)</td><td><span className="deactivation-pending-badge">⚠ Pendiente de baja</span></td><td><button className="button button--danger" type="button" onClick={() => setConfirmTarget(person)}>Confirmar baja</button></td></tr>)}</tbody></table></div>}
      </section>
      {confirmTarget ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !confirming) setConfirmTarget(null); }}><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="confirm-deactivation-title"><div className="confirm-modal__icon" aria-hidden="true">!</div><h2 id="confirm-deactivation-title">Confirmar baja</h2><p>Se devolverá al almacén todo el material activo de esta persona y después dejará de estar visible.</p><div className="confirm-modal__summary"><strong>{confirmTarget.nombreCompleto}</strong><span>{confirmTarget.departmentName || 'Sin departamento'} · {confirmTarget.materialUnits} unidades en {confirmTarget.assignmentCount} asignaciones</span></div><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setConfirmTarget(null)} disabled={confirming}>Cancelar</button><button className="button button--danger" type="button" onClick={confirmDeactivation} disabled={confirming}>{confirming ? 'Procesando…' : 'Confirmar baja'}</button></div></section></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </PageShell>
  );
}

export default DepartamentosConfiguracion;
