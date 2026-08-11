import { useState } from 'react';
import PageShell from '../components/PageShell';
import { createEntrega } from '../services/api';

const initialState = {
  material: '',
  modelo: '',
  cantidad: '',
  receptor: '',
  departamento: '',
  entregadoPor: '',
};

function NuevaEntrega() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const validate = () => {
    const nextErrors = {};
    Object.entries(form).forEach(([key, value]) => {
      if (key !== 'cantidad' && !String(value).trim()) {
        nextErrors[key] = 'Este campo es obligatorio';
      }
    });

    if (!form.cantidad || Number(form.cantidad) <= 0) {
      nextErrors.cantidad = 'La cantidad debe ser mayor que cero';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    setNotice(null);

    try {
      await createEntrega({
        ...form,
        cantidad: Number(form.cantidad),
      });

      setNotice({ type: 'success', text: 'Entrega registrada correctamente.' });
      setForm(initialState);
    } catch (error) {
      setNotice({ type: 'error', text: error?.response?.data?.message || 'No se pudo guardar la entrega.' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  return (
    <PageShell title="Nueva entrega" subtitle="Registro de entregas para el equipo operativo">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { key: 'material', label: 'Material' },
            { key: 'modelo', label: 'Modelo' },
            { key: 'cantidad', label: 'Cantidad', type: 'number' },
            { key: 'receptor', label: 'Receptor' },
            { key: 'departamento', label: 'Departamento' },
            { key: 'entregadoPor', label: 'Entregado por' },
          ].map((field) => (
            <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>{field.label}</span>
              <input
                type={field.type || 'text'}
                value={form[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                style={{ border: `1px solid ${errors[field.key] ? '#ef4444' : '#cbd5e1'}`, borderRadius: '10px', padding: '0.8rem 0.9rem', fontSize: '0.95rem' }}
              />
              {errors[field.key] ? <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>{errors[field.key]}</span> : null}
            </label>
          ))}
        </div>

        {notice ? (
          <div style={{ padding: '0.9rem 1rem', borderRadius: '10px', background: notice.type === 'success' ? '#ecfdf3' : '#fef2f2', color: notice.type === 'success' ? '#166534' : '#991b1b' }}>
            {notice.text}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" disabled={loading} style={{ padding: '0.8rem 1.2rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', cursor: loading ? 'wait' : 'pointer', fontWeight: 600 }}>
            {loading ? 'Guardando...' : 'Guardar entrega'}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

export default NuevaEntrega;
