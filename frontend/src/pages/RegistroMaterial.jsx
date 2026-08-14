import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createMaterialOrder } from '../services/api';

const initialForm = { material: '', modelo: '', cantidad: '', numeroPedido: '' };

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

  const updateQuantity = (value) => {
    if (/^\d*$/.test(value)) updateField('cantidad', value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (form.material.trim().length < 2) nextErrors.material = 'Introduce un material válido.';
    if (!form.modelo.trim()) nextErrors.modelo = 'El modelo es obligatorio.';
    if (!Number.isInteger(Number(form.cantidad)) || Number(form.cantidad) < 1) nextErrors.cantidad = 'La cantidad debe ser un número entero mayor que cero.';
    if (!form.numeroPedido.trim()) nextErrors.numeroPedido = 'El número de pedido es obligatorio.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      await createMaterialOrder({
        material: form.material.trim(), modelo: form.modelo.trim(),
        cantidadInicial: Number(form.cantidad), numeroPedido: form.numeroPedido.trim(),
      });
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
          <label className="field"><span>Material *</span><input value={form.material} onChange={(event) => updateField('material', event.target.value)} className={errors.material ? 'field__input--error' : ''} maxLength={100} />{errors.material ? <small>{errors.material}</small> : null}</label>
          <label className="field"><span>Modelo *</span><input value={form.modelo} onChange={(event) => updateField('modelo', event.target.value)} className={errors.modelo ? 'field__input--error' : ''} maxLength={100} />{errors.modelo ? <small>{errors.modelo}</small> : null}</label>
          <label className="field"><span>Cantidad *</span><input type="number" min="1" step="1" value={form.cantidad} onChange={(event) => updateQuantity(event.target.value)} className={errors.cantidad ? 'field__input--error' : ''} />{errors.cantidad ? <small>{errors.cantidad}</small> : null}</label>
          <label className="field"><span>Número de pedido *</span><input value={form.numeroPedido} onChange={(event) => updateField('numeroPedido', event.target.value)} className={errors.numeroPedido ? 'field__input--error' : ''} maxLength={100} />{errors.numeroPedido ? <small>{errors.numeroPedido}</small> : null}</label>
        </div>
        <div className="form-actions"><button className="button button--secondary" type="button" onClick={() => navigate('/almacen')} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </form>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default RegistroMaterial;
