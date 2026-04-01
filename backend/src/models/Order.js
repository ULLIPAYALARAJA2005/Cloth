const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: String,
  userEmail: String,
  items: [{
    productId: String,
    name: String,
    image: String,
    size: String,
    color: String,
    price: Number,
    quantity: Number,
  }],
  totalAmount: Number,
  paymentProof: String,
  transactionId: String,
  phone: String,
  address: mongoose.Schema.Types.Mixed,
  couponCode: String,
  status: {
    type: String,
    enum: ['pending','confirmed','shipped','delivered','cancelled','rejected'],
    default: 'pending',
  },
  statusHistory: [{
    status: String,
    timestamp: String,
  }],
  confirmedAt: String,
  shippedAt: String,
  deliveredAt: String,
  rejectionReason: { type: String, default: '' },
  userDeleted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
