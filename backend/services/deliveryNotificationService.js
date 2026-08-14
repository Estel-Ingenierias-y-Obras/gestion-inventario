const { sendGraphMail } = require('./graphMailService');

const DELIVERY_NOTIFICATION_TO = 'administracion@esteling.com';
const DELIVERY_TIMEZONE = process.env.REPORT_TIMEZONE || 'Europe/Madrid';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

const sendDeliveryNotification = (delivery) => {
  const deliveredAt = new Intl.DateTimeFormat('es-ES', {
    timeZone: DELIVERY_TIMEZONE, dateStyle: 'short', timeStyle: 'medium',
  }).format(delivery.fechaEntrega);

  const rows = [
    ['Producto', delivery.material], ['Cantidad', delivery.cantidad], ['Receptor', delivery.receptor],
    ['Departamento', delivery.departamento], ['Entregado por', delivery.entregadoPor], ['Fecha y hora', deliveredAt],
  ].map(([label, value]) => `<tr><th align="left" style="padding:8px;background:#eef3f4">${label}</th><td style="padding:8px">${escapeHtml(value)}</td></tr>`).join('');

  return sendGraphMail({
    to: DELIVERY_NOTIFICATION_TO,
    subject: 'Nueva entrega registrada',
    html: `<h1>Nueva entrega registrada</h1><table cellpadding="0" cellspacing="0" border="1" style="border-collapse:collapse">${rows}</table>`,
    idempotencyKey: `delivery:${delivery._id}`,
  });
};

module.exports = { sendDeliveryNotification };
