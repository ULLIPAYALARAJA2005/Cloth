const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  images: [mongoose.Schema.Types.Mixed],
  sizes: [{
    size: String,
    price: Number,
    mrp: Number,
    qty: { type: Number, default: 0 },
  }],
  hasSizes: { type: Boolean, default: true },
  price: Number,
  mrp: Number,
  quantity: { type: Number, default: 0 },
  colors: [String],
  tags: [String],
  ratings: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
