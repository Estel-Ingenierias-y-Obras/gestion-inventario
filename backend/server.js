require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const entregaRoutes = require('./routes/entregaRoutes');
const whitelistRoutes = require('./routes/whitelistRoutes');
const emailScheduleRoutes = require('./routes/emailScheduleRoutes');
const materialOrderRoutes = require('./routes/materialOrderRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const WhitelistUser = require('./models/WhitelistUser');
const { getAdminEmail } = require('./middleware/whitelist');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiters');
const migrateLegacyMaterialOrders = require('./services/materialOrderMigration');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origen no permitido por CORS.');
    error.statusCode = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Automation-Key'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '100kb', strict: true }));

app.use('/api', apiLimiter);
app.use('/api/entregas', entregaRoutes);
app.use('/api/whitelist', whitelistRoutes);
app.use('/api/email-schedules', emailScheduleRoutes);
app.use('/api/material-orders', materialOrderRoutes);
app.use('/api/departments', departmentRoutes);

app.get('/', apiLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'API Gestión Inventario funcionando',
  });
});

app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  await migrateLegacyMaterialOrders();

  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    throw new Error('ADMIN_EMAIL debe estar configurado.');
  }

  await WhitelistUser.updateOne(
    { email: adminEmail },
    { $setOnInsert: { name: 'Administrador principal', email: adminEmail } },
    { upsert: true }
  );

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('No se pudo iniciar el servidor.', { name: error.name });
  process.exit(1);
});
