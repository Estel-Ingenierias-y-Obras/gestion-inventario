const { sendGraphMail } = require('./graphMailService');

const DELIVERY_NOTIFICATION_TO = process.env.DELIVERY_NOTIFICATION_EMAIL || 'administracion@esteling.com';
const DELIVERY_TIMEZONE = process.env.REPORT_TIMEZONE || 'Europe/Madrid';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));

const getLogoUrl = () => {
  const configuredUrl = String(process.env.EMAIL_LOGO_URL || '').trim();
  if (configuredUrl) return configuredUrl;

  const frontendOrigin = String(process.env.CORS_ORIGIN || '').split(',')[0].trim().replace(/\/$/, '');
  return /^https?:\/\//i.test(frontendOrigin)
    ? `${frontendOrigin}/estel-isotipo-corporativo.png`
    : '';
};

const buildDeliveryNotificationHtml = (delivery) => {
  const deliveredAt = new Intl.DateTimeFormat('es-ES', {
    timeZone: DELIVERY_TIMEZONE, dateStyle: 'short', timeStyle: 'medium',
  }).format(delivery.fechaEntrega);

  const allocations = Array.isArray(delivery.stockAllocations) ? delivery.stockAllocations : [];
  const primaryOrder = allocations[0]?.numeroPedido || 'No disponible';
  const additionalOrders = Math.max(allocations.length - 1, 0);
  const orderSummary = additionalOrders > 0
    ? `${primaryOrder} (+${additionalOrders} pedido${additionalOrders === 1 ? '' : 's'} más)`
    : primaryOrder;
  const orderCard = `<tr><td style="padding:0 0 10px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7f8;border:1px solid #dce5e8;border-radius:8px;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:12px;line-height:17px;color:#64767c;">Nº Pedido</div>
        <div style="margin-top:4px;font-size:16px;line-height:22px;font-weight:700;color:#043c4b;">${escapeHtml(orderSummary)}</div>
      </td></tr>
    </table>
  </td></tr>`;
  const consumptionDetail = allocations.length > 1
    ? `<tr><td style="padding:0 0 18px;">
        <div style="padding:4px 2px 8px;font-size:13px;line-height:18px;font-weight:700;color:#043c4b;">Detalle de consumo</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid #0b596b;background-color:#f8fafb;">
          ${allocations.map((allocation) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e0e8ea;font-size:14px;line-height:20px;color:#40555c;">
            <strong>${escapeHtml(allocation.numeroPedido)}</strong> &rarr; ${escapeHtml(allocation.cantidadConsumida)} ${allocation.cantidadConsumida === 1 ? 'unidad' : 'unidades'}
          </td></tr>`).join('')}
        </table>
      </td></tr>`
    : '';
  const cards = [
    ['Material', delivery.material],
    ['Modelo', delivery.modelo],
    ['Cantidad', delivery.cantidad],
    ['Receptor', delivery.receptor],
    ['Departamento', delivery.departamento],
    ['Fecha y hora de registro', deliveredAt],
    ['Registrado por', delivery.entregadoPor],
  ].map(([label, value]) => `<tr><td style="padding:0 0 10px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f7f8;border:1px solid #dce5e8;border-radius:8px;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:12px;line-height:17px;color:#64767c;">${escapeHtml(label)}</div>
        <div style="margin-top:4px;font-size:16px;line-height:22px;font-weight:700;color:#043c4b;">${escapeHtml(value)}</div>
      </td></tr>
    </table>
  </td></tr>`).join('');

  const logoUrl = getLogoUrl();
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="46" height="46" alt="Gestión de Inventario" style="display:block;width:46px;height:46px;border:0;border-radius:9px;">`
    : '<div style="width:46px;height:46px;line-height:46px;text-align:center;background:#ffffff;color:#043c4b;border-radius:9px;font-size:24px;font-weight:700;">GI</div>';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nueva entrega registrada</title>
<style>@media only screen and (max-width:620px){.email-shell{width:100%!important}.content-pad{padding:22px 14px!important}.header-pad{padding:24px 18px!important}}</style>
</head><body style="margin:0;padding:0;background-color:#edf2f4;font-family:Arial,'Helvetica Neue',sans-serif;color:#24343a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Se ha registrado una nueva entrega de ${escapeHtml(delivery.material)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#edf2f4;">
<tr><td align="center" style="padding:24px 10px;">
<!--[if mso]><table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="width:100%;max-width:620px;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 18px rgba(16,55,66,.10);overflow:hidden;">
  <tr><td class="header-pad" style="padding:28px 30px;background-color:#043c4b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="62" valign="middle">${logo}</td>
      <td valign="middle" style="padding-left:14px;color:#ffffff;">
        <div style="font-size:13px;line-height:19px;color:#c9dce1;">Gestión de Inventario</div>
        <div style="margin-top:2px;font-size:24px;line-height:30px;font-weight:700;">Nueva entrega registrada</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td class="content-pad" style="padding:30px;">
    <div style="margin-bottom:20px;font-size:15px;line-height:23px;color:#4f6268;">Se ha guardado correctamente una nueva entrega con los siguientes datos:</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${orderCard}${consumptionDetail}${cards}</table>
  </td></tr>
  <tr><td align="center" style="padding:22px 30px;background-color:#f4f7f8;border-top:1px solid #e0e8ea;color:#66787e;font-size:12px;line-height:19px;">
    <strong style="color:#043c4b;">Gestión de Inventario</strong><br>
    Correo generado automáticamente. No responder a este mensaje.
  </td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
};

const sendDeliveryNotification = (delivery) => {
  const html = buildDeliveryNotificationHtml(delivery);

  return sendGraphMail({
    to: DELIVERY_NOTIFICATION_TO,
    subject: 'Nueva entrega registrada',
    html,
    idempotencyKey: `delivery:${delivery._id}`,
  });
};

module.exports = { DELIVERY_NOTIFICATION_TO, buildDeliveryNotificationHtml, sendDeliveryNotification };
