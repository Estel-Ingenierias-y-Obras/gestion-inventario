require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const entregaRoutes = require('./routes/entregaRoutes');
const whitelistRoutes = require('./routes/whitelistRoutes');
const WhitelistUser = require('./models/WhitelistUser');
const { getAdminEmail } = require('./middleware/whitelist');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

app.use('/api/entregas', entregaRoutes);
app.use('/api/whitelist', whitelistRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Gestión Inventario funcionando',
  });
});

app.use(errorHandler);

const startServer = async () => {
  await connectDB();

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
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
