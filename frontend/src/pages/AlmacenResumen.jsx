import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import SortableHeader from '../components/SortableHeader';
import Toast from '../components/Toast';
import { getMaterialOrders } from '../services/api';
import { nextSortConfig, sortRows } from '../utils/tableSort';

const normalizeMaterial = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es');
const columnTypes = { cantidadInicial: 'number', cantidadDisponible: 'number', pedidos: 'number' };
const descendingByDefault = new Set(['cantidadInicial', 'cantidadDisponible', 'pedidos']);

function AlmacenResumen() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'material', direction: 'asc' });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let active = true;
    getMaterialOrders()
      .then((response) => { if (active) setOrders(response.data?.data || []); })
      .catch((error) => { if (active) setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el almacén.' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const materials = useMemo(() => {
    const grouped = new Map();
    orders.forEach((order) => {
      const key = normalizeMaterial(order.material);
      if (!key) return;
      const current = grouped.get(key) || { material: String(order.material).trim(), cantidadInicial: 0, cantidadDisponible: 0, pedidos: 0 };
      current.cantidadInicial += Number(order.cantidadInicial) || 0;
      current.cantidadDisponible += Number(order.cantidadDisponible) || 0;
      current.pedidos += 1;
      grouped.set(key, current);
    });
    const query = normalizeMaterial(search);
    const filtered = [...grouped.values()].filter((item) => !query || normalizeMaterial(item.material).includes(query));
    return sortRows(filtered, sortConfig, columnTypes);
  }, [orders, search, sortConfig]);

  const handleSort = (key) => setSortConfig((current) => nextSortConfig(current, key, descendingByDefault.has(key) ? 'desc' : 'asc'));
  const openMaterial = (material) => navigate(`/almacen/material/${encodeURIComponent(material)}`);

  return (
    <PageShell title="Almacén" subtitle="Resumen del stock disponible por material" actions={(
      <div className="warehouse-page-actions">
        <div className="search-box">
          <span className="search-box__icon" aria-hidden="true">⌕</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar material…" aria-label="Buscar material en almacén" />
          {search ? <button type="button" className="search-box__clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button> : null}
        </div>
        <div className="page-action-group"><Link className="button button--secondary" to="/almacen/historial">Ver historial de pedidos</Link><Link className="button button--primary" to="/registro-material">+ Registrar material</Link></div>
      </div>
    )}>
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Materiales</h2><p>{materials.length} {materials.length === 1 ? 'material encontrado' : 'materiales encontrados'}</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={6} /></div> : materials.length === 0 ? <div className="empty-state"><span className="empty-state__icon" aria-hidden="true">⌕</span><strong>Sin resultados</strong><p>{search ? 'No hay materiales que coincidan con la búsqueda.' : 'Registra una compra para comenzar.'}</p></div> : (
          <div className="table-scroll"><table className="data-table warehouse-summary-table"><thead><tr><SortableHeader label="Material" sortKey="material" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Cantidad inicial total" sortKey="cantidadInicial" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Cantidad disponible total" sortKey="cantidadDisponible" sortConfig={sortConfig} onSort={handleSort} /><SortableHeader label="Pedidos" sortKey="pedidos" sortConfig={sortConfig} onSort={handleSort} /></tr></thead><tbody>{materials.map((item) => (
            <tr key={normalizeMaterial(item.material)} className="warehouse-table__clickable-row" role="link" tabIndex="0" aria-label={`Ver pedidos de ${item.material}`} onClick={() => openMaterial(item.material)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMaterial(item.material); } }}><td><strong>{item.material}</strong></td><td>{item.cantidadInicial}</td><td><strong>{item.cantidadDisponible}</strong></td><td>{item.pedidos}</td></tr>
          ))}</tbody></table></div>
        )}
      </section>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </PageShell>
  );
}

export default AlmacenResumen;
