const mongoose = require('mongoose');

const systemMigrationSchema = new mongoose.Schema(
  { key: { type: String, required: true, unique: true, trim: true, maxlength: 150 } },
  { timestamps: true, collection: 'systemMigrations' }
);

module.exports = mongoose.model('SystemMigration', systemMigrationSchema);
