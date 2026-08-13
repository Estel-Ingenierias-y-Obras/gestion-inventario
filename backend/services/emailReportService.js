const nodemailer = require('nodemailer');
const Entrega = require('../models/Entrega');
const auditLogger = require('../utils/auditLogger');

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
  if (frequency === 'weekly') return { start: new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)), end: now };

  const parts = getZonedParts(now);
  const currentMonthStart = zonedDateToUtc(Number(parts.year), Number(parts.month), 1);
  const previousMonthDate = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 2, 1));
  return {
    start: zonedDateToUtc(previousMonthDate.getUTCFullYear(), previousMonthDate.getUTCMonth() + 1, 1),
    end: currentMonthStart,
  };
};

const createTransport = () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Configuración SMTP incompleta: ${missing.join(', ')}`);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};

const buildReportHtml = (deliveries, frequency) => {
  const label = frequency === 'weekly' ? 'Últimos 7 días' : 'Mes natural completo';
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

const sendEmailReport = async (schedule, { user = null, req = null, reportDate = new Date(), reportPeriod = '', messageId } = {}) => {
  const range = getReportRange(schedule.frequency, reportDate);
  const deliveries = await Entrega.find({ deleted: false, fechaEntrega: { $gte: range.start, $lt: range.end } })
    .sort({ fechaEntrega: -1 }).lean();

  await createTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: schedule.email,
    subject: 'Registro de entregas',
    html: buildReportHtml(deliveries, schedule.frequency),
    ...(messageId ? { messageId } : {}),
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
