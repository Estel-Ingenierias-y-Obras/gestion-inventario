import { useCallback, useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import LoadingState from '../components/LoadingState';
import Toast from '../components/Toast';
import BackToConfiguration from '../components/BackToConfiguration';
import {
  addEmailSchedule, deleteEmailSchedule, getEmailSchedules, sendEmailSchedule, updateEmailSchedule,
} from '../services/api';

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const emptyForm = { email: '', frequency: 'weekly', dayOfWeek: 1, dayOfMonth: 1, hour: '08:00' };
const scheduleToForm = (schedule) => ({
  email: schedule.email, frequency: schedule.frequency, dayOfWeek: schedule.dayOfWeek || 1,
  dayOfMonth: schedule.dayOfMonth || 1, hour: schedule.hour,
});
const toPayload = (form) => ({
  email: form.email.trim(), frequency: form.frequency, hour: form.hour,
  dayOfWeek: form.frequency === 'weekly' ? Number(form.dayOfWeek) : null,
  dayOfMonth: form.frequency === 'monthly' ? Number(form.dayOfMonth) : null,
});

function CorreosConfiguracion() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [editingTarget, setEditingTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try { const response = await getEmailSchedules(); setSchedules(response.data?.data || []); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'No se pudieron cargar las programaciones.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const openAdd = () => { setEditingTarget(null); setForm(emptyForm); setErrors({}); setModalMode('add'); };
  const openEdit = (schedule) => { setEditingTarget(schedule); setForm(scheduleToForm(schedule)); setErrors({}); setModalMode('edit'); };
  const closeForm = () => {
    if (saving) return;
    setModalMode(null); setEditingTarget(null); setForm(emptyForm); setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Introduce un correo electrónico válido.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.hour)) nextErrors.hour = 'Selecciona una hora válida.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    try {
      if (modalMode === 'edit') await updateEmailSchedule(editingTarget._id, toPayload(form));
      else await addEmailSchedule(toPayload(form));
      setModalMode(null); setEditingTarget(null); setForm(emptyForm); setErrors({});
      await loadSchedules();
      setToast({ type: 'success', message: modalMode === 'edit' ? 'Programación actualizada correctamente' : 'Programación creada correctamente' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || (modalMode === 'edit' ? 'Error al actualizar la programación' : 'Error al guardar programación') });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try { await deleteEmailSchedule(deleteTarget._id); setDeleteTarget(null); await loadSchedules(); setToast({ type: 'success', message: 'Programación eliminada correctamente' }); }
    catch (error) { setToast({ type: 'error', message: error?.response?.data?.message || 'Error al eliminar programación' }); }
    finally { setSaving(false); }
  };
  const handleSend = async (schedule) => {
    setBusyId(schedule._id);
    try { await sendEmailSchedule(schedule._id); setToast({ type: 'success', message: 'Correo enviado correctamente' }); await loadSchedules(); }
    catch { setToast({ type: 'error', message: 'Error al enviar correo' }); }
    finally { setBusyId(null); }
  };
  const dayLabel = (schedule) => schedule.frequency === 'weekly' ? days[schedule.dayOfWeek - 1] : `Día ${schedule.dayOfMonth}`;
  const isEditing = modalMode === 'edit';

  return (
    <PageShell title="Correos" subtitle="Programación automática de informes de entregas" actions={<button className="button button--primary" type="button" onClick={openAdd}>+ Añadir programación</button>}>
      <BackToConfiguration />
      <section className="panel">
        <div className="panel__header panel__header--compact"><div><h2>Programaciones</h2><p>{schedules.length} envíos configurados</p></div></div>
        {loading ? <div className="panel__body"><LoadingState rows={5} /></div> : schedules.length === 0 ? <div className="panel__body empty-state"><span className="empty-state__icon">@</span><strong>No hay programaciones</strong><p>Añade una para comenzar a enviar informes.</p></div> : (
          <div className="table-scroll"><table className="data-table email-table"><thead><tr><th>Destinatario</th><th>Periodo del informe</th><th>Día</th><th>Hora</th><th>Estado</th><th className="actions-column">Acciones</th></tr></thead><tbody>{schedules.map((schedule) => (
            <tr key={schedule._id}><td><strong>{schedule.email}</strong></td><td>{schedule.frequency === 'weekly' ? 'Semanal' : 'Mensual'}</td><td>{dayLabel(schedule)}</td><td>{schedule.hour}</td><td><span className={`schedule-status ${schedule.active ? 'schedule-status--active' : ''}`}>{schedule.active ? 'Activo' : 'Inactivo'}</span></td><td className="actions-column"><div className="table-actions">
              <button className="icon-button" type="button" disabled={busyId === schedule._id} onClick={() => handleSend(schedule)} aria-label={`Enviar ahora a ${schedule.email}`} title="Enviar ahora">✉</button>
              <button className="icon-button icon-button--edit" type="button" disabled={busyId === schedule._id} onClick={() => openEdit(schedule)} aria-label={`Editar programación de ${schedule.email}`} title="Editar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.3-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.3 16 4 20Zm10.8-13.5 2.7 2.7" /></svg></button>
              <button className="icon-button icon-button--delete" type="button" disabled={busyId === schedule._id} onClick={() => setDeleteTarget(schedule)} aria-label={`Eliminar programación de ${schedule.email}`} title="Eliminar">🗑</button>
            </div></td></tr>
          ))}</tbody></table></div>
        )}
      </section>

      {modalMode ? <div className="modal-backdrop" role="presentation"><form className="dialog-card" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="schedule-form-title">
        <h2 id="schedule-form-title">{isEditing ? 'Editar programación' : 'Añadir programación'}</h2><p>{isEditing ? 'Actualiza el destinatario y la periodicidad del informe.' : 'Configura el destinatario y la periodicidad del informe.'}</p>
        <label className="field"><span>Correo destinatario</span><input autoFocus type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={errors.email ? 'field__input--error' : ''} />{errors.email ? <small>{errors.email}</small> : null}</label>
        <label className="field"><span>Periodo del informe</span><select value={form.frequency} onChange={(event) => setForm((current) => ({ ...current, frequency: event.target.value }))}><option value="weekly">Semanal — desde el lunes</option><option value="monthly">Mensual — desde el día 1</option></select></label>
        {form.frequency === 'weekly' ? <label className="field"><span>Día</span><select value={form.dayOfWeek} onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))}>{days.map((day, index) => <option key={day} value={index + 1}>{day}</option>)}</select></label> : <label className="field"><span>Día del mes</span><select value={form.dayOfMonth} onChange={(event) => setForm((current) => ({ ...current, dayOfMonth: event.target.value }))}>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>Día {index + 1}</option>)}</select></label>}
        <label className="field"><span>Hora</span><input type="time" value={form.hour} onChange={(event) => setForm((current) => ({ ...current, hour: event.target.value }))} className={errors.hour ? 'field__input--error' : ''} />{errors.hour ? <small>{errors.hour}</small> : null}</label>
        <div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={closeForm} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button></div>
      </form></div> : null}

      {deleteTarget ? <div className="modal-backdrop" role="presentation"><section className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="delete-email-title"><div className="confirm-modal__icon">!</div><h2 id="delete-email-title">Eliminar programación</h2><p>¿Está seguro de que desea eliminar esta programación?</p><div className="confirm-modal__summary"><strong>{deleteTarget.email}</strong><span>{deleteTarget.frequency === 'weekly' ? 'Informe semanal' : 'Informe mensual'} · {dayLabel(deleteTarget)} a las {deleteTarget.hour}</span></div><div className="dialog-card__actions"><button className="button button--secondary" type="button" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button><button className="button button--danger" type="button" onClick={handleDelete} disabled={saving}>{saving ? 'Eliminando…' : 'Eliminar'}</button></div></section></div> : null}
      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </PageShell>
  );
}

export default CorreosConfiguracion;
