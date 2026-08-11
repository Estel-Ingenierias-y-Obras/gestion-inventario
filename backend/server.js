require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const entregaRoutes = require('./routes/entregaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(limiter);

// TODO: integrar Microsoft Entra ID en una siguiente etapa para proteger rutas.
app.use('/api/entregas', entregaRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Gestión Inventario funcionando',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
