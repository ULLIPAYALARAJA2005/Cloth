const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  amount: { type: Number, required: true },
  expiry: String,
  usageLimit: { type: Number, default: 100 },
  usedCount: { type: Number, default: 0 },
  minOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  terms: String,
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
