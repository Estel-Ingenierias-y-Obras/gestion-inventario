const mongoose = require('mongoose');

const whitelistUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
    },
  },
  { timestamps: true }
);

whitelistUserSchema.index({ createdAt: 1 });

module.exports = mongoose.model('WhitelistUser', whitelistUserSchema);
