import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackToConfiguration from '../components/BackToConfiguration';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import SortableHeader from '../components/SortableHeader';
import Toast from '../components/Toast';
import { getDepartments, synchronizeEntraCatalog } from '../services/api';
import { nextSortConfig, sortRows } from '../utils/tableSort';
import EntraSimulacion from './EntraSimulacion';

function DepartamentosConfiguracion() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' });

  const visibleDepartments = useMemo(() => sortRows(departments, sort, {
    employeeCount: 'number', materialCount: 'number',
  }), [departments, sort]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDepartments();
      setDepartments(response.data?.data || []);
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
      <div className="department-entra-observation"><EntraSimulacion /></div>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </PageShell>
  );
}

export default DepartamentosConfiguracion;
