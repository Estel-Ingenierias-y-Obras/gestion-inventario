const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    createdBy: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
  },
  { timestamps: true, collection: 'departments' }
);

departmentSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'es', strength: 2 } }
);

module.exports = mongoose.model('Department', departmentSchema);
