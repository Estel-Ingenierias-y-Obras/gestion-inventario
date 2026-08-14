import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createMaterialOrder } from '../services/api';

const initialForm = { numeroCompra: '', producto: '', cantidadInicial: '', proveedor: '', recibido: false };

function RegistroMaterial() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.numeroCompra.trim()) nextErrors.numeroCompra = 'El número de compra es obligatorio.';
    if (form.producto.trim().length < 2) nextErrors.producto = 'Introduce un producto válido.';
    if (!Number.isInteger(Number(form.cantidadInicial)) || Number(form.cantidadInicial) < 1) nextErrors.cantidadInicial = 'Las unidades deben ser un número entero mayor que cero.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await createMaterialOrder({ ...form, cantidadInicial: Number(form.cantidadInicial) });
      setForm(initialForm);
      setToast({ type: 'success', message: 'Material registrado correctamente.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Error al registrar el material.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Registro de material" subtitle="Registra compras y controla su recepción en almacén">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="form-card__header"><div><h2>Datos de la compra</h2><p>Los campos marcados con * son obligatorios.</p></div><span className="status-badge"><span /> Control de almacén</span></div>
        <div className="form-grid">
          <label className="field"><span>Número de compra *</span><input value={form.numeroCompra} onChange={(event) => updateField('numeroCompra', event.target.value)} className={errors.numeroCompra ? 'field__input--error' : ''} maxLength={100} />{errors.numeroCompra ? <small>{errors.numeroCompra}</small> : null}</label>
          <label className="field"><span>Producto *</span><input value={form.producto} onChange={(event) => updateField('producto', event.target.value)} className={errors.producto ? 'field__input--error' : ''} maxLength={100} />{errors.producto ? <small>{errors.producto}</small> : null}</label>
          <label className="field"><span>Unidades *</span><input type="number" min="1" step="1" value={form.cantidadInicial} onChange={(event) => updateField('cantidadInicial', event.target.value)} className={errors.cantidadInicial ? 'field__input--error' : ''} />{errors.cantidadInicial ? <small>{errors.cantidadInicial}</small> : null}</label>
          <label className="field"><span>Proveedor (opcional)</span><input value={form.proveedor} onChange={(event) => updateField('proveedor', event.target.value)} maxLength={150} /></label>
          <label className="checkbox-field"><input type="checkbox" checked={form.recibido} onChange={(event) => updateField('recibido', event.target.checked)} /><span>Material recibido</span></label>
        </div>
        <div className="form-actions"><button className="button button--secondary" type="button" onClick={() => navigate('/almacen')} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default RegistroMaterial;
