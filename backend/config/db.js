const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('MongoDB conectado.');
  } catch (error) {
    console.error('Error al conectar MongoDB.', { name: error.name });
    process.exit(1);
  }
};

module.exports = connectDB;
