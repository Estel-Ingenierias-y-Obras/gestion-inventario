import { useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createEntrega, getPeopleCatalog, getStockCatalog } from '../services/api';

const initialState = { material: '', modelo: '', numeroSerie: '', cantidad: '', personId: '', departmentId: '' };
const normalizeSearch = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

function NuevaEntrega() {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [recipientQuery, setRecipientQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
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
    getPeopleCatalog()
      .then((response) => { if (active) setPeople(response.data?.data || []); })
      .catch((error) => { if (active) setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudieron cargar las personas.' }); })
      .finally(() => { if (active) setPeopleLoading(false); });
    return () => { active = false; };
  }, []);

  const materials = useMemo(() => [...new Set(catalog.map((item) => item.material))], [catalog]);
  const models = useMemo(() => catalog.filter((item) => item.material === form.material), [catalog, form.material]);
  const selectedStock = models.find((item) => item.modelo === form.modelo)?.cantidadDisponible || 0;
  const selectedPerson = people.find((person) => person._id === form.personId);
  const recipientSuggestions = useMemo(() => {
    const query = normalizeSearch(recipientQuery);
    if (!query) return [];
    return people.filter((person) => normalizeSearch(person.nombreCompleto).includes(query)).slice(0, 8);
  }, [people, recipientQuery]);

  const validate = () => {
    const nextErrors = {};
    ['material', 'modelo', 'personId', 'departmentId'].forEach((key) => {
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
      setRecipientQuery('');
      setSuggestionsOpen(false);
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

  const selectPerson = (person) => {
    setForm((current) => ({ ...current, personId: person._id, departmentId: person.departmentId }));
    setRecipientQuery(person.nombreCompleto);
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    setErrors((current) => ({ ...current, personId: '', departmentId: '' }));
  };

  const updateRecipientQuery = (value) => {
    setRecipientQuery(value);
    setForm((current) => ({ ...current, personId: '', departmentId: '' }));
    setSuggestionsOpen(Boolean(value.trim()));
    setActiveSuggestion(-1);
    setErrors((current) => ({ ...current, personId: '', departmentId: '' }));
  };

  const handleRecipientKeyDown = (event) => {
    if (!suggestionsOpen || recipientSuggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % recipientSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? recipientSuggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      selectPerson(recipientSuggestions[activeSuggestion]);
    } else if (event.key === 'Escape') {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
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
        <div className="form-card__header"><div><h2>Datos de la entrega</h2><p>El número de serie es opcional; el resto de campos son obligatorios.</p></div><span className="status-badge"><span /> Registro seguro</span></div>
        <div className="form-grid">
          <label className="field"><span>Material</span><select value={form.material} onChange={(event) => updateMaterial(event.target.value)} className={errors.material ? 'field__input--error' : ''} disabled={catalogLoading}><option value="" disabled>{catalogLoading ? 'Cargando materiales…' : 'Selecciona un material'}</option>{materials.map((material) => <option key={material} value={material}>{material}</option>)}</select>{errors.material ? <small>{errors.material}</small> : null}</label>
          <label className="field"><span>Modelo</span><select value={form.modelo} onChange={(event) => updateModel(event.target.value)} className={errors.modelo ? 'field__input--error' : ''} disabled={!form.material}><option value="" disabled>Selecciona un modelo</option>{models.map((item) => <option key={item.modelo} value={item.modelo}>{item.modelo}</option>)}</select>{errors.modelo ? <small>{errors.modelo}</small> : null}</label>
          <div className={`stock-availability${form.modelo ? ' stock-availability--available' : ''}`}><span>Stock disponible</span><strong>{form.modelo ? `${selectedStock} unidades` : 'Selecciona un modelo'}</strong></div>
          <label className="field"><span>Cantidad</span><input type="number" min="1" max={selectedStock || undefined} step="1" value={form.cantidad} onChange={(event) => updateQuantity(event.target.value)} className={errors.cantidad ? 'field__input--error' : ''} disabled={!form.modelo || selectedStock < 1} />{errors.cantidad ? <small>{errors.cantidad}</small> : null}</label>
          <label className="field"><span>Número de serie <small>(opcional)</small></span><input value={form.numeroSerie} maxLength={150} onChange={(event) => updateField('numeroSerie', event.target.value)} placeholder="Introduce el número de serie" /></label>
          <div className="field recipient-combobox"><label htmlFor="recipient-search">Receptor</label><input id="recipient-search" role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={suggestionsOpen && recipientSuggestions.length > 0} aria-controls="recipient-suggestions" aria-activedescendant={activeSuggestion >= 0 ? `recipient-option-${activeSuggestion}` : undefined} value={recipientQuery} onChange={(event) => updateRecipientQuery(event.target.value)} onFocus={() => setSuggestionsOpen(Boolean(recipientQuery.trim()))} onBlur={() => setTimeout(() => setSuggestionsOpen(false), 120)} onKeyDown={handleRecipientKeyDown} placeholder={peopleLoading ? 'Cargando personas…' : 'Escribe para buscar una persona'} disabled={peopleLoading || people.length === 0} className={errors.personId ? 'field__input--error' : ''} />{suggestionsOpen && recipientQuery.trim() ? <div className="recipient-suggestions" id="recipient-suggestions" role="listbox">{recipientSuggestions.length > 0 ? recipientSuggestions.map((person, index) => <button id={`recipient-option-${index}`} className={`recipient-suggestion${activeSuggestion === index ? ' recipient-suggestion--active' : ''}`} type="button" role="option" aria-selected={activeSuggestion === index} key={person._id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPerson(person)}><strong>{person.nombreCompleto}</strong><span>{person.departmentName}</span></button>) : <p>No hay personas que coincidan.</p>}</div> : null}{errors.personId ? <small>{errors.personId}</small> : null}</div>
          <label className="field"><span>Departamento</span><input value={selectedPerson?.departmentName || ''} placeholder="Se completa al seleccionar una persona" readOnly aria-readonly="true" className={errors.departmentId ? 'field__input--error' : ''} />{errors.departmentId ? <small>{errors.departmentId}</small> : null}</label>
          <div className="authenticated-user"><span className="authenticated-user__icon">✓</span><div><small>Entregado por</small><strong>Usuario autenticado</strong></div></div>
        </div>
        <div className="form-actions"><span>La fecha y el usuario se registrarán automáticamente.</span><button type="submit" disabled={loading} className="button button--primary">{loading ? 'Guardando…' : 'Guardar entrega'}</button></div>
      </form>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default NuevaEntrega;
