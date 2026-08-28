import { useCallback, useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import Toast from '../components/Toast';
import { createEntrega, getDepartments, getPeopleCatalog, getStockCatalog } from '../services/api';

const emptyLine = { material: '', modelo: '', numeroSerie: '', cantidad: '' };

function NuevaEntrega() {
  const [catalog, setCatalog] = useState([]);
  const [people, setPeople] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [personId, setPersonId] = useState('');
  const [line, setLine] = useState(emptyLine);
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try { const response = await getStockCatalog(); setCatalog(response.data?.data || []); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo cargar el stock disponible.' }); }
    finally { setCatalogLoading(false); }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => {
    let active = true;
    Promise.all([getPeopleCatalog(), getDepartments()]).then(([peopleResponse, departmentsResponse]) => {
      if (active) { setPeople(peopleResponse.data?.data || []); setDepartments(departmentsResponse.data?.data || []); }
    })
      .catch((error) => { if (active) setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudieron cargar las personas.' }); })
      .finally(() => { if (active) setPeopleLoading(false); });
    return () => { active = false; };
  }, []);

  const materials = useMemo(() => [...new Set(catalog.map((item) => item.material))], [catalog]);
  const models = useMemo(() => catalog.filter((item) => item.material === line.material), [catalog, line.material]);
  const stock = models.find((item) => item.modelo === line.modelo)?.cantidadDisponible || 0;
  const reserved = items.filter((item) => item.material === line.material && item.modelo === line.modelo)
    .reduce((total, item) => total + item.cantidad, 0);
  const available = Math.max(stock - reserved, 0);
  const selectedPerson = people.find((person) => person._id === personId);
  const selectedDepartment = departments.find((department) => department._id === departmentId);

  const updateLine = (field, value) => {
    setLine((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  };

  const addLine = () => {
    const nextErrors = {};
    const quantity = Number(line.cantidad);
    if (!line.material) nextErrors.material = 'Selecciona un material.';
    if (!line.modelo) nextErrors.modelo = 'Selecciona un modelo.';
    if (!Number.isInteger(quantity) || quantity < 1) nextErrors.cantidad = 'Introduce una cantidad válida.';
    else if (quantity > available) nextErrors.cantidad = 'No hay suficiente stock disponible.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setItems((current) => [...current, { ...line, cantidad: quantity, id: crypto.randomUUID() }]);
    setLine(emptyLine);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!departmentId || !personId || items.length === 0) {
      setToast({ type: 'error', message: 'Selecciona departamento, persona y añade al menos un material.' });
      return;
    }
    setLoading(true);
    try {
      const response = await createEntrega({ departmentId, personId, items: items.map(({ id: _id, ...item }) => item) });
      setItems([]); setLine(emptyLine);
      setToast({ type: 'success', message: response.data?.notificationSent === false
        ? 'Entrega guardada. No se pudo enviar el correo resumen.' : 'Entrega guardada y correo resumen enviado.' });
      await loadCatalog();
    } catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudo registrar la entrega.' }); }
    finally { setLoading(false); }
  };

  return (
    <PageShell title="Nueva entrega" subtitle="Asigna varios materiales a una persona en una única operación">
      <form className="delivery-flow" onSubmit={save} noValidate>
        <section className="form-card delivery-step"><div className="form-card__header"><div><h2>1. Persona</h2><p>Selecciona la persona que recibirá el material.</p></div></div>
          <label className="field"><span>Persona</span><select value={personId} disabled={peopleLoading} onChange={(event) => { const nextPersonId = event.target.value; const person = people.find((item) => item._id === nextPersonId); setPersonId(nextPersonId); setDepartmentId(person ? String(person.departmentId) : ''); }}><option value="">{peopleLoading ? 'Cargando personas…' : 'Selecciona una persona'}</option>{people.map((person) => <option key={person._id} value={person._id}>{person.nombreCompleto}</option>)}</select></label>
        </section>
        <section className={`form-card delivery-step${!personId ? ' delivery-step--disabled' : ''}`}><div className="form-card__header"><div><h2>2. Departamento</h2><p>Departamento asociado automáticamente a la persona.</p></div></div>
          <label className="field"><span>Departamento</span><input value={selectedDepartment?.name || selectedPerson?.departmentName || ''} placeholder="Selecciona primero una persona" readOnly /></label>
        </section>
        <section className={`form-card delivery-step${!personId ? ' delivery-step--disabled' : ''}`}><div className="form-card__header"><div><h2>3. Materiales</h2><p>Añade todas las líneas que formarán parte de la entrega a {selectedPerson?.nombreCompleto || 'la persona seleccionada'}.</p></div></div>
          <div className="form-grid delivery-line-editor">
            <label className="field"><span>Material</span><select value={line.material} disabled={!personId || catalogLoading} className={errors.material ? 'field__input--error' : ''} onChange={(event) => { setLine({ ...emptyLine, material: event.target.value }); setErrors({}); }}><option value="">Selecciona un material</option>{materials.map((material) => <option key={material}>{material}</option>)}</select>{errors.material ? <small>{errors.material}</small> : null}</label>
            <label className="field"><span>Modelo</span><select value={line.modelo} disabled={!line.material} className={errors.modelo ? 'field__input--error' : ''} onChange={(event) => { setLine((current) => ({ ...current, modelo: event.target.value, cantidad: '' })); setErrors({}); }}><option value="">Selecciona un modelo</option>{models.map((model) => <option key={model.modelo}>{model.modelo}</option>)}</select>{errors.modelo ? <small>{errors.modelo}</small> : null}</label>
            <label className="field"><span>Cantidad</span><input type="number" min="1" max={available || undefined} value={line.cantidad} disabled={!line.modelo} className={errors.cantidad ? 'field__input--error' : ''} onChange={(event) => updateLine('cantidad', event.target.value)} />{errors.cantidad ? <small>{errors.cantidad}</small> : <small>{line.modelo ? `${available} unidades disponibles` : 'Selecciona un modelo'}</small>}</label>
            <label className="field"><span>Número de serie <small>(opcional)</small></span><input maxLength={150} value={line.numeroSerie} disabled={!line.modelo} onChange={(event) => updateLine('numeroSerie', event.target.value)} /></label>
          </div>
          <div className="delivery-add-line"><button className="button button--secondary" type="button" onClick={addLine} disabled={!personId}>+ Añadir material</button></div>
          <div className="delivery-summary"><h3>Resumen temporal</h3>{items.length === 0 ? <div className="empty-state"><p>Aún no has añadido materiales.</p></div> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Material</th><th>Modelo</th><th>Cantidad</th><th>Número de serie</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.material}</strong></td><td>{item.modelo}</td><td>{item.cantidad}</td><td>{item.numeroSerie || '-'}</td><td><button className="icon-button icon-button--delete" type="button" title="Quitar" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}>×</button></td></tr>)}</tbody></table></div>}</div>
          <div className="form-actions"><span>Se registrarán {items.length} {items.length === 1 ? 'línea' : 'líneas'} y se enviará un único correo.</span><button className="button button--primary" disabled={loading || items.length === 0}>{loading ? 'Guardando…' : 'Guardar entrega'}</button></div>
        </section>
      </form>
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default NuevaEntrega;
