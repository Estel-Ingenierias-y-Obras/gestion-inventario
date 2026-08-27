import { useCallback, useEffect, useMemo, useState } from 'react';
import BackToConfiguration from '../components/BackToConfiguration';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createEntraSimulation, getEntraSimulationItems, getEntraSimulations } from '../services/api';

const tabs = [
  ['ELIGIBLE_USER', 'Usuarios elegibles'],
  ['EXCLUDED_USER', 'Usuarios excluidos'],
  ['DEPARTMENT', 'Departamentos detectados'],
  ['DEPARTMENT_REMOVAL_PREVIEW', 'Departamentos que desaparecerían'],
  ['POTENTIAL_DEACTIVATION', 'Bajas potenciales'],
  ['MATERIAL_RETURN_PREVIEW', 'Material a devolver'],
  ['TRACEABILITY_PROBLEM', 'Problemas de trazabilidad'],
];

const metrics = [
  ['usersRead', 'Usuarios leídos'], ['usersEligible', 'Elegibles'],
  ['usersExcluded', 'Excluidos'], ['usersExcludedByCountry', 'Descartados por país'],
  ['usersExcludedByLicense', 'Descartados por licencia'],
  ['usersExcludedMissingDepartment', 'Sin departamento'], ['usersExcludedMissingGivenName', 'Sin nombre'],
  ['usersExcludedMissingSurname', 'Sin apellido'], ['departmentsDetected', 'Departamentos detectados'],
  ['departmentsToRemove', 'Departamentos que desaparecerían'],
  ['potentialDeactivations', 'Bajas potenciales'], ['materialUnitsToReturn', 'Material afectado'],
  ['traceabilityProblems', 'Problemas trazabilidad'],
];

const reasonLabels = {
  LICENSE_NOT_ALLOWED: 'Sin licencia admitida', USER_NOT_FOUND: 'No encontrado en Entra',
  COUNTRY_NOT_ALLOWED: 'País distinto de España', COUNTRY_NOT_PROVIDED: 'País no informado',
  DEPARTMENT_NOT_PROVIDED: 'Departamento no informado', DEPARTMENT_INVALID: 'Departamento no válido',
  GIVEN_NAME_NOT_PROVIDED: 'Nombre no informado', SURNAME_NOT_PROVIDED: 'Apellido no informado',
  NO_ELIGIBLE_USERS: 'Sin usuarios elegibles',
};

const readableReason = (value) => String(value || '').split(',').filter(Boolean)
  .map((reason) => reasonLabels[reason] || reason).join(', ') || '—';
const skuNames = {
  SPB: 'Microsoft 365 Business Premium',
  O365_BUSINESS_PREMIUM: 'Microsoft 365 Business Standard',
  O365_BUSINESS_ESSENTIALS: 'Microsoft 365 Business Basic',
};

function UserTable({ items, type }) {
  if (type === 'DEPARTMENT' || type === 'DEPARTMENT_REMOVAL_PREVIEW') return (
    <table className="data-table entra-table"><thead><tr><th>Departamento</th><th>Tipo</th><th>Usuarios</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item._id}><td><strong>{item.department}</strong></td><td>{type === 'DEPARTMENT_REMOVAL_PREVIEW' ? readableReason(item.reason) : item.classification}</td><td>{item.details?.userCount ?? 0}</td></tr>)}</tbody></table>
  );
  if (type === 'MATERIAL_RETURN_PREVIEW' || type === 'TRACEABILITY_PROBLEM') return (
    <table className="data-table entra-table"><thead><tr><th>Persona</th><th>Motivo</th><th>Material previsto</th><th>Problemas</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item._id}><td><strong>{item.displayName || '—'}</strong></td><td>{readableReason(item.reason)}</td><td>{item.materialPreview?.length ? item.materialPreview.map((material) => `${material.cantidad} × ${material.material} ${material.modelo}`).join('; ') : 'Sin material'}</td><td>{item.traceabilityProblems?.length ? item.traceabilityProblems.map((problem) => problem.code).join(', ') : 'Ninguno'}</td></tr>)}</tbody></table>
  );
  return (
    <table className="data-table entra-table"><thead><tr><th>Usuario</th><th>Nombre</th><th>Apellido</th><th>Correo</th><th>Departamento</th><th>Licencias detectadas</th><th>{type === 'PERSON_MATCH' ? 'Confianza' : 'Motivo'}</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item._id}><td><strong>{item.details?.displayName || item.displayName || '—'}</strong></td><td>{item.details?.givenName || '—'}</td><td>{item.details?.surname || '—'}</td><td>{item.mail || '—'}</td><td>{item.department || '—'}</td><td>{item.matchedAllowedSkus?.length ? item.matchedAllowedSkus.map((sku) => sku.skuPartNumber).join(', ') : 'Ninguna válida'}</td><td>{type === 'PERSON_MATCH' ? item.matching?.confidence : readableReason(item.reason || item.dataIssues?.join(','))}</td></tr>)}</tbody></table>
  );
}

function EntraSimulacion() {
  const [run, setRun] = useState(null);
  const [activeTab, setActiveTab] = useState(tabs[0][0]);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getEntraSimulations({ page: 1, limit: 1 });
      setRun(response.data?.data?.[0] || null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar la última simulación.' });
    } finally { setLoading(false); }
  }, []);

  const loadItems = useCallback(async (runId, type, page = 1) => {
    if (!runId) { setItems([]); return; }
    setItemsLoading(true);
    try {
      const response = await getEntraSimulationItems(runId, { type, page, limit: 10 });
      setItems(response.data?.data || []);
      setPagination(response.data?.pagination || { page, totalPages: 0, total: 0 });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el detalle.' });
    } finally { setItemsLoading(false); }
  }, []);

  useEffect(() => { loadLatest(); }, [loadLatest]);
  useEffect(() => { if (run?._id) loadItems(run._id, activeTab, 1); }, [run?._id, activeTab, loadItems]);

  const executeSimulation = async () => {
    setRunning(true);
    try {
      const response = await createEntraSimulation();
      setRun(response.data?.data || null);
      setToast({ type: 'success', message: 'Simulación completada correctamente.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'La simulación no pudo completarse.' });
    } finally { setRunning(false); }
  };

  const statusLabel = useMemo(() => ({ COMPLETED: 'Completada', FAILED: 'Fallida', RUNNING: 'En ejecución', CONFIGURATION_PENDING: 'Configuración pendiente' }[run?.status] || run?.status), [run?.status]);

  return (
    <PageShell title="Observación de Microsoft Entra ID" subtitle="Validación estricta de usuarios, departamentos y licencias antes de publicar el catálogo.">
      <BackToConfiguration />
      <div className="entra-observation-actions"><button className="button button--primary" type="button" onClick={executeSimulation} disabled={running}>{running ? 'Ejecutando…' : 'Ejecutar simulación'}</button></div>
      <p className="entra-readonly-note">La simulación no modifica personas, departamentos, asignaciones ni stock.</p>
      {loading ? <LoadingState rows={6} /> : !run ? <section className="panel"><div className="empty-state"><strong>No hay simulaciones.</strong><p>Ejecuta la primera simulación para validar el tenant.</p></div></section> : <>
        <section className="entra-run-summary"><div><span>Última ejecución</span><strong>{new Date(run.completedAt || run.startedAt).toLocaleString('es-ES')}</strong></div><div><span>Estado</span><strong>{statusLabel}</strong></div><div><span>Modo</span><strong>Solo lectura</strong></div></section>
        <section className="entra-metric-grid">{metrics.map(([key, label]) => <article className="entra-metric-card" key={key}><span>{label}</span><strong>{run.counters?.[key] ?? 0}</strong></article>)}</section>
        <section className="panel"><div className="panel__header"><div><h2>Licencias válidas resueltas</h2><p>Correspondencia real entre producto, skuPartNumber y skuId del tenant.</p></div></div><div className="table-scroll"><table className="data-table entra-table"><thead><tr><th>Producto</th><th>skuPartNumber</th><th>skuId</th><th>Estado</th></tr></thead><tbody>{(run.resolvedAllowedSkus || []).map((sku) => <tr key={sku.skuId}><td><strong>{skuNames[sku.skuPartNumber] || 'Producto Microsoft 365'}</strong></td><td>{sku.skuPartNumber}</td><td className="entra-monospace">{sku.skuId}</td><td>{sku.capabilityStatus}</td></tr>)}</tbody></table></div></section>
        <section className="panel entra-results"><div className="entra-tabs" role="tablist" aria-label="Resultados de simulación">{tabs.map(([type, label]) => <button type="button" role="tab" aria-selected={activeTab === type} className={`entra-tab${activeTab === type ? ' entra-tab--active' : ''}`} key={type} onClick={() => setActiveTab(type)}>{label}</button>)}</div>{itemsLoading ? <div className="panel__body"><LoadingState rows={6} /></div> : items.length ? <><div className="table-scroll"><UserTable items={items} type={activeTab} /></div><div className="pagination"><span>{pagination.total} resultados</span><div className="pagination__controls"><button className="button button--secondary" type="button" disabled={pagination.page <= 1} onClick={() => loadItems(run._id, activeTab, pagination.page - 1)}>Anterior</button><span>Página {pagination.page} de {pagination.totalPages || 1}</span><button className="button button--secondary" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => loadItems(run._id, activeTab, pagination.page + 1)}>Siguiente</button></div></div></> : <div className="empty-state"><strong>No hay resultados en esta categoría.</strong></div>}</section>
      </>}
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </PageShell>
  );
}

export default EntraSimulacion;
