const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },
  addresses: [{
    id: String,
    label: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    mobile1: String,
    mobile2: String,
    isDefault: Boolean,
  }],
  wishlist: [{ type: String }],
  lastOrdersViewAt: { type: Date, default: Date.now },
  resetOTP: String,
  resetOTPExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
