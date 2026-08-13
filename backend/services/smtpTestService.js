const nodemailer = require('nodemailer');

const TEST_FROM = 'soporte@esteling.com';
const TEST_TO = 'javier.costa@esteling.com';

const testSmtpDelivery = async () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error(`Configuración SMTP incompleta: ${missing.join(', ')}`);
    error.code = 'SMTP_CONFIG_MISSING';
    throw error;
  }

  if (process.env.SMTP_FROM.trim().toLowerCase() !== TEST_FROM) {
    const error = new Error(`SMTP_FROM debe ser ${TEST_FROM} para ejecutar esta prueba.`);
    error.code = 'SMTP_FROM_INVALID';
    throw error;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.verify();
    const result = await transporter.sendMail({
      from: TEST_FROM,
      to: TEST_TO,
      subject: 'Prueba SMTP - Gestión de Inventario',
      text: 'Prueba SMTP completada correctamente desde la aplicación Gestión de Inventario.',
      html: '<p>Prueba SMTP completada correctamente desde la aplicación <strong>Gestión de Inventario</strong>.</p>',
    });

    return {
      connected: true,
      authenticated: true,
      from: TEST_FROM,
      to: TEST_TO,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  } finally {
    transporter.close();
  }
};

module.exports = { testSmtpDelivery };
