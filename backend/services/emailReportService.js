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

const formatReportDateTime = (date) => new Intl.DateTimeFormat('es-ES', {
  timeZone: REPORT_TIMEZONE,
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(date);

const getEmailLogoUrl = () => {
  const configuredUrl = String(process.env.EMAIL_LOGO_URL || '').trim();
  if (configuredUrl) return configuredUrl;

  const frontendOrigin = String(process.env.CORS_ORIGIN || '').split(',')[0].trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(frontendOrigin)
    ? `${frontendOrigin}/estel-isotipo-corporativo.png`
    : '';
};

const buildReportHtml = (deliveries, frequency, { recipient = '', generatedAt = new Date() } = {}) => {
  const label = frequency === 'weekly' ? 'Semana actual' : 'Mes actual';
  const generationDate = formatReportDateTime(generatedAt);
  const logoUrl = getEmailLogoUrl();
  const rows = deliveries.map((delivery, index) => `<tr style="background-color:${index % 2 === 0 ? '#ffffff' : '#f4f7f8'};">
    <td style="padding:12px 10px;border-bottom:1px solid #dce5e8;white-space:nowrap;">${escapeHtml(new Date(delivery.fechaEntrega).toLocaleDateString('es-ES', { timeZone: REPORT_TIMEZONE }))}</td>
    <td style="padding:12px 10px;border-bottom:1px solid #dce5e8;">${escapeHtml(delivery.material)}</td>
    <td style="padding:12px 10px;border-bottom:1px solid #dce5e8;">${escapeHtml(delivery.modelo)}</td>
    <td style="padding:12px 10px;border-bottom:1px solid #dce5e8;">${escapeHtml(delivery.receptor)}</td>
    <td style="padding:12px 10px;border-bottom:1px solid #dce5e8;">${escapeHtml(delivery.departamento)}</td>
    <td style="padding:12px 10px;border-bottom:1px solid #dce5e8;">${escapeHtml(delivery.entregadoPor)}</td>
    <td align="center" style="padding:12px 10px;border-bottom:1px solid #dce5e8;font-weight:700;">${escapeHtml(delivery.cantidad)}</td>
  </tr>`).join('');

  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="Gestión de Inventario" style="display:block;width:48px;height:48px;border:0;outline:none;text-decoration:none;border-radius:10px;">`
    : '<div style="font-size:28px;line-height:48px;font-weight:700;color:#043c4b;text-align:center;background:#ffffff;border-radius:10px;width:48px;height:48px;">GI</div>';

  const reportContent = deliveries.length > 0
    ? `<table role="table" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid #dce5e8;border-radius:8px;font-size:13px;color:#24343a;">
        <thead><tr style="background-color:#07566a;color:#ffffff;">
          <th align="left" style="padding:13px 10px;">Fecha</th><th align="left" style="padding:13px 10px;">Material</th>
          <th align="left" style="padding:13px 10px;">Modelo</th><th align="left" style="padding:13px 10px;">Receptor</th>
          <th align="left" style="padding:13px 10px;">Departamento</th><th align="left" style="padding:13px 10px;">Entregado por</th>
          <th align="center" style="padding:13px 10px;">Cantidad</th>
        </tr></thead><tbody>${rows}</tbody>
      </table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef7f4;border:1px solid #c9e3d9;border-radius:8px;">
        <tr><td style="padding:24px;color:#245b4d;font-size:15px;line-height:23px;">
          <span style="font-size:20px;vertical-align:middle;">&#10003;</span>&nbsp;
          <strong>No se han registrado entregas durante el periodo seleccionado.</strong>
        </td></tr>
      </table>`;

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registro de entregas</title>
<style>@media only screen and (max-width:620px){.email-shell{width:100%!important}.content-pad{padding:22px 14px!important}.summary-cell{display:block!important;width:100%!important}.report-table-wrap{overflow-x:auto!important}.header-title{font-size:23px!important}}</style>
</head><body style="margin:0;padding:0;background-color:#edf2f4;font-family:Arial,'Helvetica Neue',sans-serif;color:#24343a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Informe automático de entregas: ${escapeHtml(label)}, ${deliveries.length} registros.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#edf2f4;">
<tr><td align="center" style="padding:24px 10px;">
<!--[if mso]><table role="presentation" width="760" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="width:100%;max-width:760px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 18px rgba(16,55,66,.10);overflow:hidden;">
  <tr><td style="padding:28px 30px;background-color:#043c4b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="64" valign="middle">${logo}</td>
      <td valign="middle" style="padding-left:14px;color:#ffffff;">
        <div class="header-title" style="font-size:26px;line-height:32px;font-weight:700;">Gestión de Inventario</div>
        <div style="margin-top:4px;font-size:14px;line-height:20px;color:#c9dce1;">Informe automático de entregas</div>
      </td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;background-color:#0b596b;border-radius:8px;">
      <tr>
        <td width="50%" style="padding:17px 20px;border-right:1px solid #347585;color:#ffffff;">
          <div style="font-size:11px;line-height:16px;text-transform:uppercase;letter-spacing:.7px;color:#bcd5db;">Periodo del informe</div>
          <div style="margin-top:4px;font-size:19px;line-height:25px;font-weight:700;">${escapeHtml(label)}</div>
        </td>
        <td width="50%" style="padding:17px 20px;color:#ffffff;">
          <div style="font-size:11px;line-height:16px;text-transform:uppercase;letter-spacing:.7px;color:#bcd5db;">Total de entregas registradas</div>
          <div style="margin-top:4px;font-size:22px;line-height:25px;font-weight:700;">${deliveries.length}</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td class="content-pad" style="padding:30px;">
    <div style="font-size:18px;line-height:24px;font-weight:700;color:#043c4b;margin-bottom:14px;">Resumen ejecutivo</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="summary-cell" width="50%" valign="top" style="padding:0 6px 12px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f8;border:1px solid #e0e8ea;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:12px;color:#64767c;">Entregas registradas</div><div style="margin-top:5px;font-size:22px;font-weight:700;color:#043c4b;">${deliveries.length}</div></td></tr></table></td>
      <td class="summary-cell" width="50%" valign="top" style="padding:0 0 12px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f8;border:1px solid #e0e8ea;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:12px;color:#64767c;">Periodo</div><div style="margin-top:5px;font-size:16px;font-weight:700;color:#043c4b;">${escapeHtml(label)}</div></td></tr></table></td>
    </tr><tr>
      <td class="summary-cell" width="50%" valign="top" style="padding:0 6px 12px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f8;border:1px solid #e0e8ea;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:12px;color:#64767c;">Fecha de generación</div><div style="margin-top:5px;font-size:14px;font-weight:700;color:#043c4b;">${escapeHtml(generationDate)}</div></td></tr></table></td>
      <td class="summary-cell" width="50%" valign="top" style="padding:0 0 12px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f8;border:1px solid #e0e8ea;border-radius:8px;"><tr><td style="padding:16px;"><div style="font-size:12px;color:#64767c;">Destinatario</div><div style="margin-top:5px;font-size:14px;font-weight:700;color:#043c4b;word-break:break-word;">${escapeHtml(recipient)}</div></td></tr></table></td>
    </tr></table>
    <div style="height:1px;background-color:#e0e8ea;margin:14px 0 26px;"></div>
    <div style="font-size:18px;line-height:24px;font-weight:700;color:#043c4b;margin-bottom:14px;">Detalle de entregas</div>
    <div class="report-table-wrap" style="width:100%;">${reportContent}</div>
  </td></tr>
  <tr><td align="center" style="padding:24px 30px;background-color:#f4f7f8;border-top:1px solid #e0e8ea;color:#66787e;font-size:12px;line-height:19px;">
    <strong style="color:#043c4b;">Gestión de Inventario</strong><br>
    Correo generado automáticamente. No responder a este mensaje.<br>
    Fecha de generación: ${escapeHtml(generationDate)}
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
};

const sendEmailReport = async (schedule, { user = null, req = null, reportDate = new Date(), reportPeriod = '', idempotencyKey = '' } = {}) => {
  const range = getReportRange(schedule.frequency, reportDate);
  const deliveries = await Entrega.find({ deleted: false, fechaEntrega: { $gte: range.start, $lte: range.end } })
    .sort({ fechaEntrega: -1 }).lean();

  await sendGraphMail({
    to: schedule.email,
    subject: 'Registro de entregas',
    html: buildReportHtml(deliveries, schedule.frequency, {
      recipient: schedule.email,
      generatedAt: reportDate,
    }),
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

module.exports = { REPORT_TIMEZONE, getZonedParts, zonedDateToUtc, getReportRange, buildReportHtml, sendEmailReport };
