import { useCallback, useState } from 'react';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createEntrega } from '../services/api';

const initialState = { material: '', modelo: '', cantidad: '', receptor: '', departamento: '' };

const departamentos = [
  'IT',
  'RRHH',
  'Producción',
  'Administración',
  'Energía',
  'Marketing',
  'SAT',
  'Almacén',
  'Proyectos',
  'Presupuestos',
];

function NuevaEntrega() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const validate = () => {
    const nextErrors = {};
    Object.entries(form).forEach(([key, value]) => {
      if (key !== 'cantidad' && !String(value).trim()) nextErrors[key] = 'Este campo es obligatorio';
    });
    if (!form.cantidad || Number(form.cantidad) <= 0) nextErrors.cantidad = 'La cantidad debe ser mayor que cero';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setToast({ type: 'error', message: 'Revisa los campos marcados antes de continuar.' });
      return;
    }

    setLoading(true);
    try {
      await createEntrega({ ...form, cantidad: Number(form.cantidad) });
      setForm(initialState);
      setToast({ type: 'success', message: 'Entrega creada correctamente.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Error al realizar la operación.' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  return (
    <PageShell title="Nueva entrega" subtitle="Registra una asignación de material al equipo">
      <form onSubmit={handleSubmit} className="form-card" noValidate>
        <div className="form-card__header"><div><h2>Datos de la entrega</h2><p>Todos los campos son obligatorios.</p></div><span className="status-badge"><span /> Registro seguro</span></div>
        <div className="form-grid">
          {[
            { key: 'material', label: 'Material', placeholder: 'Ej. Portátil' },
            { key: 'modelo', label: 'Modelo', placeholder: 'Ej. Surface Laptop 6' },
            { key: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '1' },
            { key: 'receptor', label: 'Receptor', placeholder: 'Nombre y apellidos' },
            { key: 'departamento', label: 'Departamento', type: 'select' },
          ].map((field) => (
            <label key={field.key} className="field">
              <span>{field.label}</span>
              {field.type === 'select' ? (
                <select value={form[field.key]} onChange={(event) => updateField(field.key, event.target.value)} className={errors[field.key] ? 'field__input--error' : ''} required>
                  <option value="" disabled>Selecciona un departamento</option>
                  {departamentos.map((departamento) => <option key={departamento} value={departamento}>{departamento}</option>)}
                </select>
              ) : (
                <input type={field.type || 'text'} min={field.type === 'number' ? '1' : undefined} value={form[field.key]} placeholder={field.placeholder} onChange={(event) => updateField(field.key, event.target.value)} className={errors[field.key] ? 'field__input--error' : ''} />
              )}
              {errors[field.key] ? <small>{errors[field.key]}</small> : null}
            </label>
          ))}
          <div className="authenticated-user"><span className="authenticated-user__icon">✓</span><div><small>Entregado por</small><strong>Usuario autenticado</strong></div></div>
        </div>
        <div className="form-actions"><span>La fecha y el usuario se registrarán automáticamente.</span><button type="submit" disabled={loading} className="button button--primary">{loading ? 'Guardando…' : 'Guardar entrega'}</button></div>
      </form>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default NuevaEntrega;
