const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  orderId: String,
  userId: { type: String, required: true },
  userName: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
