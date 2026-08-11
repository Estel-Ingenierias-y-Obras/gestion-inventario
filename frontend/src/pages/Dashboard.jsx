import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import { getEntregas } from '../services/api';

function Dashboard() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const cargar = async () => {
      try {
        const response = await getEntregas();
        if (isActive) {
          setEntregas(response.data?.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    cargar();
    return () => {
      isActive = false;
    };
  }, []);

  const estadisticas = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    return {
      entregasHoy: entregas.filter((item) => new Date(item.fechaEntrega).toDateString() === hoy.toDateString()).length,
      entregasMes: entregas.filter((item) => new Date(item.fechaEntrega).getMonth() === mesActual && new Date(item.fechaEntrega).getFullYear() === anioActual).length,
      departamentos: new Set(entregas.map((item) => item.departamento)).size,
      usuarios: new Set(entregas.map((item) => item.entregadoPor)).size,
    };
  }, [entregas]);

  const cards = [
    { label: 'Entregas hoy', value: estadisticas.entregasHoy, tone: '#2563eb' },
    { label: 'Entregas este mes', value: estadisticas.entregasMes, tone: '#0f766e' },
    { label: 'Departamentos', value: estadisticas.departamentos, tone: '#7c3aed' },
    { label: 'Usuarios con material', value: estadisticas.usuarios, tone: '#dc2626' },
  ];

  return (
    <PageShell title="Dashboard" subtitle="Resumen ejecutivo del estado operativo">
      <div style={{ display: 'grid', gap: '1rem' }}>
        {loading ? (
          <LoadingState rows={4} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {cards.map((card) => (
              <div key={card.label} style={{ background: 'white', borderRadius: '16px', padding: '1.1rem', boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}>
                <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '0.4rem' }}>{card.label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: card.tone }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '16px', padding: '1rem', boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.6rem' }}>Últimos movimientos</div>
          {loading ? (
            <LoadingState rows={5} />
          ) : entregas.length === 0 ? (
            <div style={{ color: '#64748b' }}>No hay entregas registradas aún.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#334155' }}>Fecha</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#334155' }}>Material</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#334155' }}>Receptor</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', color: '#334155' }}>Departamento</th>
                  </tr>
                </thead>
                <tbody>
                  {entregas.slice(0, 6).map((item) => (
                    <tr key={item._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem' }}>{new Date(item.fechaEntrega).toLocaleDateString()}</td>
                      <td style={{ padding: '0.75rem' }}>{item.material}</td>
                      <td style={{ padding: '0.75rem' }}>{item.receptor}</td>
                      <td style={{ padding: '0.75rem' }}>{item.departamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default Dashboard;
