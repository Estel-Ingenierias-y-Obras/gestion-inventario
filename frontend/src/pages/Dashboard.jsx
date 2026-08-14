import { useCallback, useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { getEntregas, getEntregaStats } from '../services/api';

const initialStats = { entregasHoy: 0, entregasMes: 0, departamentos: 0, usuarios: 0 };

function Dashboard() {
  const [entregas, setEntregas] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    let isActive = true;

    const cargar = async () => {
      try {
        const [entregasResponse, statsResponse] = await Promise.all([
          getEntregas({ page: 1, limit: 6 }),
          getEntregaStats(),
        ]);

        if (isActive) {
          setEntregas(entregasResponse.data?.data || []);
          setStats(statsResponse.data?.data || initialStats);
        }
      } catch {
        if (isActive) setToast({ type: 'error', message: 'No se pudo cargar el resumen operativo.' });
      } finally {
        if (isActive) setLoading(false);
      }
    };

    cargar();
    return () => { isActive = false; };
  }, []);

  const cards = [
    { label: 'Entregas hoy', value: stats.entregasHoy, tone: 'blue', icon: '↗' },
    { label: 'Entregas este mes', value: stats.entregasMes, tone: 'teal', icon: '▦' },
    { label: 'Departamentos', value: stats.departamentos, tone: 'violet', icon: '⌂' },
    { label: 'Usuarios únicos', value: stats.usuarios, tone: 'amber', icon: '◎' },
  ];

  return (
    <PageShell title="Dashboard" subtitle="Resumen ejecutivo del inventario y la actividad reciente">
      {loading ? (
        <div className="metric-grid"><LoadingState rows={4} /></div>
      ) : (
        <div className="metric-grid">
          {cards.map((card) => (
            <article key={card.label} className={`metric-card metric-card--${card.tone}`}>
              <div className="metric-card__icon" aria-hidden="true">{card.icon}</div>
              <div>
                <div className="metric-card__label">{card.label}</div>
                <div className="metric-card__value">{card.value}</div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Últimos movimientos</h2>
            <p>Las seis entregas registradas más recientemente</p>
          </div>
          <span className="status-badge"><span /> Datos actualizados</span>
        </div>
        {loading ? (
          <div className="panel__body"><LoadingState rows={5} /></div>
        ) : entregas.length === 0 ? (
          <div className="empty-state">No hay entregas registradas aún.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Material</th><th>Receptor</th><th>Departamento</th><th>Entregado por</th></tr></thead>
              <tbody>
                {entregas.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.fechaEntrega).toLocaleDateString()}</td>
                    <td><strong>{item.material}</strong><span className="table-secondary">{item.modelo}</span></td>
                    <td>{item.receptor}</td>
                    <td><span className="tag">{item.departamento}</span></td>
                    <td>{item.entregadoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default Dashboard;
