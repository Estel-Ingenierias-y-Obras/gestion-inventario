require('dotenv').config();

const mongoose = require('mongoose');
const Entrega = require('../models/Entrega');

const catalogo = [
  ['Portátil', 'Surface Laptop 6', 1, 'Marta Gómez', 'Finanzas', 'Carlos Ruiz'],
  ['Monitor', 'Dell P2425H', 2, 'Alejandro Martín', 'Operaciones', 'Laura Sánchez'],
  ['Teclado', 'Logitech MX Keys', 1, 'Elena Torres', 'Recursos Humanos', 'Carlos Ruiz'],
  ['Teléfono', 'iPhone 15', 1, 'Daniel Romero', 'Comercial', 'Sofía Navarro'],
  ['Auriculares', 'Jabra Evolve2 65', 1, 'Lucía Vega', 'Atención al cliente', 'Laura Sánchez'],
  ['Dock USB-C', 'Dell WD22TB4', 1, 'Pablo Gil', 'Tecnología', 'Carlos Ruiz'],
  ['Tablet', 'Surface Pro 10', 1, 'Irene Castro', 'Dirección', 'Sofía Navarro'],
  ['Ratón', 'Logitech MX Master 3S', 1, 'Javier León', 'Marketing', 'Laura Sánchez'],
];

const diasAtras = [0, 0, 1, 2, 3, 5, 7, 9, 12, 15, 18, 22, 27, 32, 38, 45, 52, 61, 72, 84, 96, 110, 125, 145];

const construirFecha = (dias, index) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  fecha.setHours(9 + (index % 8), (index * 7) % 60, 0, 0);
  return fecha;
};

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const operaciones = diasAtras.map((dias, index) => {
    const [material, modelo, cantidad, receptor, departamento, entregadoPor] = catalogo[index % catalogo.length];
    const createdBy = `seed-development-v1-${String(index + 1).padStart(2, '0')}`;
    const fechaEntrega = construirFecha(dias, index);

    return {
      updateOne: {
        filter: { createdBy },
        update: {
          $set: {
            material,
            modelo,
            cantidad,
            receptor,
            departamento,
            entregadoPor,
            fechaEntrega,
            createdAt: fechaEntrega,
            updatedAt: fechaEntrega,
            createdBy,
          },
        },
        upsert: true,
      },
    };
  });

  const resultado = await Entrega.bulkWrite(operaciones);
  console.log(`Datos de desarrollo preparados: ${diasAtras.length} entregas (${resultado.upsertedCount} nuevas).`);
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error('No se pudieron generar los datos de desarrollo:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
