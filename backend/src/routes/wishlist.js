const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/auth');

// Helper to check if ID is valid MongoDB ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /api/wishlist — returns full product objects
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.user.uid)) return res.status(401).json({ message: 'Session expired. Please login again.' });
    const user = await User.findById(req.user.uid).select('wishlist');
    const ids = user?.wishlist || [];
    if (ids.length === 0) return res.json([]);
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const formatImage = img => {
      if (typeof img === 'string') return img.replace(/ /g, '%20');
      if (img && typeof img === 'object' && img.url) return { ...img, url: img.url.replace(/ /g, '%20') };
      return img;
    };
    
    const result = products.map(p => ({
      ...p,
      id: p._id.toString(),
      images: (p.images || []).map(formatImage),
    }));
    res.json(result);
  } catch (err) {
    console.error('Wishlist error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/wishlist/:productId
router.post('/:productId', authMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.user.uid)) return res.status(401).json({ message: 'Session expired. Please login again.' });
    await User.findByIdAndUpdate(req.user.uid, { $addToSet: { wishlist: req.params.productId } });
    res.json({ message: 'Added to wishlist' });
  } catch (err) {
    console.error('Wishlist POST error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', authMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.user.uid)) return res.status(401).json({ message: 'Session expired. Please login again.' });
    await User.findByIdAndUpdate(req.user.uid, { $pull: { wishlist: req.params.productId } });
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error('Wishlist DELETE error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
