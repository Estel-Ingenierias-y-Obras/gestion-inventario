import { useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createEntrega, getDepartments, getStockCatalog } from '../services/api';

const initialState = { material: '', modelo: '', cantidad: '', receptor: '', departamento: '' };

function NuevaEntrega() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const response = await getStockCatalog();
      setCatalog(response.data?.data || []);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el stock disponible.' });
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  useEffect(() => {
    let active = true;
    getDepartments()
      .then((response) => { if (active) setDepartments(response.data?.data || []); })
      .catch((error) => { if (active) setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudieron cargar los departamentos.' }); })
      .finally(() => { if (active) setDepartmentsLoading(false); });
    return () => { active = false; };
  }, []);

  const materials = useMemo(() => [...new Set(catalog.map((item) => item.material))], [catalog]);
  const models = useMemo(() => catalog.filter((item) => item.material === form.material), [catalog, form.material]);
  const selectedStock = models.find((item) => item.modelo === form.modelo)?.cantidadDisponible || 0;

  const validate = () => {
    const nextErrors = {};
    ['material', 'modelo', 'receptor', 'departamento'].forEach((key) => {
      if (!String(form[key]).trim()) nextErrors[key] = 'Este campo es obligatorio';
    });
    const quantity = Number(form.cantidad);
    if (!Number.isInteger(quantity) || quantity < 1) nextErrors.cantidad = 'La cantidad debe ser un número entero mayor que cero';
    else if (quantity > selectedStock) nextErrors.cantidad = 'No hay suficiente stock disponible';
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
      await loadCatalog();
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

  const updateMaterial = (value) => {
    setForm((current) => ({ ...current, material: value, modelo: '', cantidad: '' }));
    setErrors((current) => ({ ...current, material: '', modelo: '', cantidad: '' }));
  };

  const updateModel = (value) => {
    setForm((current) => ({ ...current, modelo: value, cantidad: '' }));
    setErrors((current) => ({ ...current, modelo: '', cantidad: '' }));
  };

  const updateQuantity = (value) => {
    if (!/^\d*$/.test(value)) return;
    if (value && Number(value) > selectedStock) {
      setErrors((current) => ({ ...current, cantidad: 'No hay suficiente stock disponible' }));
      return;
    }
    updateField('cantidad', value);
  };

  return (
    <PageShell title="Nueva entrega" subtitle="Registra una asignación de material al equipo">
      <form onSubmit={handleSubmit} className="form-card" noValidate>
        <div className="form-card__header"><div><h2>Datos de la entrega</h2><p>Todos los campos son obligatorios.</p></div><span className="status-badge"><span /> Registro seguro</span></div>
        <div className="form-grid">
          <label className="field"><span>Material</span><select value={form.material} onChange={(event) => updateMaterial(event.target.value)} className={errors.material ? 'field__input--error' : ''} disabled={catalogLoading}><option value="" disabled>{catalogLoading ? 'Cargando materiales…' : 'Selecciona un material'}</option>{materials.map((material) => <option key={material} value={material}>{material}</option>)}</select>{errors.material ? <small>{errors.material}</small> : null}</label>
          <label className="field"><span>Modelo</span><select value={form.modelo} onChange={(event) => updateModel(event.target.value)} className={errors.modelo ? 'field__input--error' : ''} disabled={!form.material}><option value="" disabled>Selecciona un modelo</option>{models.map((item) => <option key={item.modelo} value={item.modelo}>{item.modelo}</option>)}</select>{errors.modelo ? <small>{errors.modelo}</small> : null}</label>
          <div className={`stock-availability${form.modelo ? ' stock-availability--available' : ''}`}><span>Stock disponible</span><strong>{form.modelo ? `${selectedStock} unidades` : 'Selecciona un modelo'}</strong></div>
          <label className="field"><span>Cantidad</span><input type="number" min="1" max={selectedStock || undefined} step="1" value={form.cantidad} onChange={(event) => updateQuantity(event.target.value)} className={errors.cantidad ? 'field__input--error' : ''} disabled={!form.modelo || selectedStock < 1} />{errors.cantidad ? <small>{errors.cantidad}</small> : null}</label>
          <label className="field"><span>Receptor</span><input value={form.receptor} placeholder="Nombre y apellidos" onChange={(event) => updateField('receptor', event.target.value)} className={errors.receptor ? 'field__input--error' : ''} />{errors.receptor ? <small>{errors.receptor}</small> : null}</label>
          <label className="field"><span>Departamento</span><select value={form.departamento} onChange={(event) => updateField('departamento', event.target.value)} className={errors.departamento ? 'field__input--error' : ''} disabled={departmentsLoading || departments.length === 0}><option value="" disabled>{departmentsLoading ? 'Cargando departamentos…' : departments.length === 0 ? 'No hay departamentos registrados.' : 'Selecciona un departamento'}</option>{departments.map((department) => <option key={department._id} value={department.name}>{department.name}</option>)}</select>{errors.departamento ? <small>{errors.departamento}</small> : null}</label>
          <div className="authenticated-user"><span className="authenticated-user__icon">✓</span><div><small>Entregado por</small><strong>Usuario autenticado</strong></div></div>
        </div>
        <div className="form-actions"><span>La fecha y el usuario se registrarán automáticamente.</span><button type="submit" disabled={loading} className="button button--primary">{loading ? 'Guardando…' : 'Guardar entrega'}</button></div>
      </form>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default NuevaEntrega;
