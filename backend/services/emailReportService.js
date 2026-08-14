const Entrega = require('../models/Entrega');
const auditLogger = require('../utils/auditLogger');
const { sendGraphMail } = require('./graphMailService');

const REPORT_TIMEZONE = process.env.REPORT_TIMEZONE || 'Europe/Madrid';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

const getZonedParts = (date) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
);

const zonedDateToUtc = (year, month, day, hour = 0, minute = 0) => {
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let result = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(result));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    result += target - represented;
  }
  return new Date(result);
};

const getReportRange = (frequency, now = new Date()) => {
  const parts = getZonedParts(now);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  if (frequency === 'weekly') {
    const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
    const monday = new Date(Date.UTC(year, month - 1, day - (weekday - 1)));
    return {
      start: zonedDateToUtc(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate()),
      end: now,
    };
  }

  return {
    start: zonedDateToUtc(year, month, 1),
    end: now,
  };
};

const buildReportHtml = (deliveries, frequency) => {
  const label = frequency === 'weekly' ? 'Semana actual' : 'Mes actual';
  const rows = deliveries.map((delivery) => `<tr>
    <td>${escapeHtml(new Date(delivery.fechaEntrega).toLocaleDateString('es-ES', { timeZone: REPORT_TIMEZONE }))}</td>
    <td>${escapeHtml(delivery.material)}</td><td>${escapeHtml(delivery.modelo)}</td>
    <td>${escapeHtml(delivery.receptor)}</td><td>${escapeHtml(delivery.departamento)}</td>
    <td>${escapeHtml(delivery.entregadoPor)}</td><td>${escapeHtml(delivery.cantidad)}</td>
  </tr>`).join('');

  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#24343a">
    <h1 style="color:#043c4b">Registro de entregas</h1><p>${label}: ${deliveries.length} movimientos.</p>
    <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%;font-size:13px">
      <thead style="background:#043c4b;color:#fff"><tr><th>Fecha</th><th>Material</th><th>Modelo</th><th>Receptor</th><th>Departamento</th><th>Entregado por</th><th>Cantidad</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7">No hay entregas en este periodo.</td></tr>'}</tbody>
    </table></body></html>`;
};

const sendEmailReport = async (schedule, { user = null, req = null, reportDate = new Date(), reportPeriod = '', idempotencyKey = '' } = {}) => {
  const range = getReportRange(schedule.frequency, reportDate);
  const deliveries = await Entrega.find({ deleted: false, fechaEntrega: { $gte: range.start, $lte: range.end } })
    .sort({ fechaEntrega: -1 }).lean();

  await sendGraphMail({
    to: schedule.email,
    subject: 'Registro de entregas',
    html: buildReportHtml(deliveries, schedule.frequency),
    idempotencyKey,
  });

  schedule.lastSentAt = new Date();
  await schedule.save();
  await auditLogger({
    action: 'EMAIL_REPORT_SENT', entity: 'EmailSchedule', user,
    details: { recipientEmail: schedule.email, reportType: schedule.frequency, reportPeriod }, req,
  });
  return { deliveries: deliveries.length };
};

module.exports = { REPORT_TIMEZONE, getZonedParts, zonedDateToUtc, getReportRange, sendEmailReport };
