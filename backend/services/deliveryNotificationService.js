const { sendGraphMail } = require('./graphMailService');
const DeliveryNotificationRecipient = require('../models/DeliveryNotificationRecipient');

const DELIVERY_TIMEZONE = process.env.REPORT_TIMEZONE || 'Europe/Madrid';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

const getLogoUrl = () => {
  const configuredUrl = String(process.env.EMAIL_LOGO_URL || '').trim();
  if (configuredUrl) return configuredUrl;
  const frontendOrigin = String(process.env.CORS_ORIGIN || '').split(',')[0].trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(frontendOrigin) ? `${frontendOrigin}/estel-isotipo-corporativo.png` : '';
};

const orderSummary = (delivery) => {
  const orders = [...new Set((delivery.stockAllocations || []).map((item) => item.numeroPedido).filter(Boolean))];
  return orders.length ? orders.join(', ') : '-';
};

const buildRows = (operation) => {
  const newDeliveries = [];
  const transfers = [];
  for (const delivery of operation.deliveries || []) {
    const sources = delivery.transferSources || [];
    const transferred = sources.reduce((total, source) => total + Number(source.cantidad || 0), 0);
    const common = { material: delivery.material, modelo: delivery.modelo, pedido: orderSummary(delivery) };
    if (delivery.cantidad > transferred) newDeliveries.push({ ...common, cantidad: delivery.cantidad - transferred });
    sources.forEach((source) => transfers.push({ ...common, pedido: source.numeroPedido || '-', cantidad: source.cantidad,
      receptorAnterior: source.previousPersonName, nuevoReceptor: operation.receptor,
      numeroSerie: source.numeroSerie || delivery.numeroSerie || null }));
  }
  return { newDeliveries, transfers };
};

const table = (title, headers, rows) => `<div style="margin-top:24px;font-size:18px;line-height:24px;font-weight:700;color:#043c4b;">${escapeHtml(title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border:1px solid #dce5e8;border-radius:8px;border-collapse:separate;border-spacing:0;overflow:hidden;">
    <tr>${headers.map((header) => `<th align="left" style="padding:10px;background:#f4f7f8;border-bottom:1px solid #dce5e8;font-size:12px;color:#52676e;">${escapeHtml(header.label)}</th>`).join('')}</tr>
    ${rows.map((row) => `<tr>${headers.map((header) => `<td style="padding:10px;border-bottom:1px solid #e7edef;font-size:13px;line-height:19px;color:#30464d;">${escapeHtml(row[header.key] ?? '-')}</td>`).join('')}</tr>`).join('')}
  </table>`;

const buildDeliveryNotificationHtml = (operation) => {
  const deliveredAt = new Intl.DateTimeFormat('es-ES', { timeZone: DELIVERY_TIMEZONE, dateStyle: 'short', timeStyle: 'medium' }).format(operation.fechaEntrega);
  const { newDeliveries, transfers } = buildRows(operation);
  const standardHeaders = [{ key: 'material', label: 'Material' }, { key: 'modelo', label: 'Modelo' },
    { key: 'cantidad', label: 'Cantidad' }, { key: 'pedido', label: 'Pedido de compra' }];
  const transferHeaders = [...standardHeaders, { key: 'receptorAnterior', label: 'Receptor anterior' }, { key: 'nuevoReceptor', label: 'Nuevo receptor' }];
  const logoUrl = getLogoUrl();
  const logo = logoUrl ? `<img src="${escapeHtml(logoUrl)}" width="46" height="46" alt="Gestión de Inventario" style="display:block;border:0;border-radius:9px;">`
    : '<div style="width:46px;height:46px;line-height:46px;text-align:center;background:#fff;color:#043c4b;border-radius:9px;font-size:24px;font-weight:700;">GI</div>';
  const sections = `${newDeliveries.length ? table('Nuevas entregas', standardHeaders, newDeliveries) : ''}${transfers.length ? table('Traspasos', transferHeaders, transfers) : ''}`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumen de entrega realizada</title></head>
  <body style="margin:0;padding:0;background:#edf2f4;font-family:Arial,'Helvetica Neue',sans-serif;color:#24343a;"><div style="display:none;max-height:0;overflow:hidden;">Resumen de ${escapeHtml((operation.deliveries || []).length)} materiales entregados.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px;background:#fff;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:28px 30px;background:#043c4b;"><table role="presentation"><tr><td>${logo}</td><td style="padding-left:14px;color:#fff;"><div style="font-size:13px;color:#c9dce1;">Gestión de Inventario</div><div style="font-size:24px;font-weight:700;">Resumen de entrega realizada</div></td></tr></table></td></tr>
    <tr><td style="padding:30px;"><table role="presentation" width="100%"><tr><td style="padding:6px 0;color:#64767c;">Receptor</td><td style="font-weight:700;color:#043c4b;">${escapeHtml(operation.receptor)}</td></tr><tr><td style="padding:6px 0;color:#64767c;">Departamento</td><td style="font-weight:700;color:#043c4b;">${escapeHtml(operation.departamento)}</td></tr><tr><td style="padding:6px 0;color:#64767c;">Fecha</td><td style="font-weight:700;color:#043c4b;">${escapeHtml(deliveredAt)}</td></tr></table>${sections}</td></tr>
    <tr><td align="center" style="padding:22px;background:#f4f7f8;border-top:1px solid #e0e8ea;color:#66787e;font-size:12px;"><strong style="color:#043c4b;">Gestión de Inventario</strong><br>Correo generado automáticamente. No responder.</td></tr>
  </table></td></tr></table></body></html>`;
};

const sendDeliveryNotification = async (operation) => {
  const recipients = await DeliveryNotificationRecipient.find().sort({ email: 1 }).select('email').lean();
  if (recipients.length === 0) {
    const error = new Error('No hay destinatarios configurados para las notificaciones de nuevas entregas.');
    error.code = 'DELIVERY_NOTIFICATION_RECIPIENTS_EMPTY';
    throw error;
  }
  const html = buildDeliveryNotificationHtml(operation);
  return Promise.all(recipients.map((recipient) => sendGraphMail({
    to: recipient.email,
    subject: 'Resumen de entrega realizada',
    html,
    idempotencyKey: `delivery-operation:${operation.operationId}:recipient:${recipient._id}`,
  })));
};

module.exports = { buildDeliveryNotificationHtml, buildRows, sendDeliveryNotification };
