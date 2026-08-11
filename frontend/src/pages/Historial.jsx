import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import { getEntregas } from '../services/api';

function Historial() {
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        const response = await getEntregas();
        setEntregas(response.data?.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const filtered = useMemo(() => {
    return entregas.filter((item) => {
      const term = search.toLowerCase();
      return [item.material, item.modelo, item.receptor, item.departamento, item.entregadoPor]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [entregas, search]);

  return (
    <PageShell title="Historial" subtitle="Consulta y seguimiento de movimientos" actions={<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.7rem 0.8rem', minWidth: '220px' }} />}>
      <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(15,23,42,0.08)' }}>
        {loading ? (
          <div style={{ padding: '2rem', color: '#64748b' }}>Cargando historial...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem', color: '#64748b' }}>No hay entregas para mostrar.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Material</th>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Modelo</th>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Cantidad</th>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Receptor</th>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Departamento</th>
                <th style={{ textAlign: 'left', padding: '0.9rem', color: '#334155' }}>Entregado por</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.9rem' }}>{new Date(item.fechaEntrega).toLocaleDateString()}</td>
                  <td style={{ padding: '0.9rem' }}>{item.material}</td>
                  <td style={{ padding: '0.9rem' }}>{item.modelo}</td>
                  <td style={{ padding: '0.9rem' }}>{item.cantidad}</td>
                  <td style={{ padding: '0.9rem' }}>{item.receptor}</td>
                  <td style={{ padding: '0.9rem' }}>{item.departamento}</td>
                  <td style={{ padding: '0.9rem' }}>{item.entregadoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}

export default Historial;
