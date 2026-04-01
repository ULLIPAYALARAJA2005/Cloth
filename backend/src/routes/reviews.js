const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');

const updateProductRating = async (productId) => {
  const allReviews = await Review.find({ productId });
  const newCount = allReviews.length;
  const avgRating = newCount > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / newCount : 0;
  await Product.findByIdAndUpdate(productId, { ratings: Math.round(avgRating * 10) / 10, reviewCount: newCount });
};

// GET /api/reviews — admin: all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).lean();
    const products = await Product.find({}, '_id name').lean();
    const prodMap = {};
    products.forEach(p => prodMap[p._id.toString()] = p.name);
    const enriched = reviews.map(r => ({ ...r, id: r._id.toString(), productName: prodMap[r.productId] || 'Unknown Product' }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/my — user's own reviews
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user.uid }).sort({ createdAt: -1 }).lean();
    res.json(reviews.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/:productId — public
router.get('/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({ createdAt: -1 }).lean();
    res.json(reviews.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reviews — user submits review (only after delivery)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;
    if (!productId || !rating) return res.status(400).json({ message: 'productId and rating required' });

    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ message: 'Order not found' });
      if (order.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden' });
      if (order.status !== 'delivered') return res.status(400).json({ message: 'Can only review after delivery' });
    }

    const existing = await Review.findOne({ productId, orderId: orderId || null, userId: req.user.uid });
    if (existing) return res.status(409).json({ message: 'You have already reviewed this product' });

    const review = await Review.create({
      productId,
      orderId: orderId || null,
      userId: req.user.uid,
      userName: req.user.name,
      rating: Number(rating),
      comment: comment || '',
    });

    // Update product aggregate rating
    await updateProductRating(productId);

    res.status(201).json({ ...review.toObject(), id: review._id.toString() });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/reviews/:id — user or admin edits a review
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Check ownership or admin status before updating
    const existingReview = await Review.findById(req.params.id);
    if (!existingReview) return res.status(404).json({ message: 'Review not found' });
    if (existingReview.userId !== req.user.uid && req.user.role !== 'admin') {
       return res.status(403).json({ message: 'Forbidden' });
    }

    const review = await Review.findByIdAndUpdate(req.params.id, { rating: Number(rating), comment }, { new: true });
    if (review) await updateProductRating(review.productId);
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/reviews/:id — user or admin deletes a review
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check ownership or admin status before deleting
    const existingReview = await Review.findById(req.params.id);
    if (!existingReview) return res.status(404).json({ message: 'Review not found' });
    if (existingReview.userId !== req.user.uid && req.user.role !== 'admin') {
       return res.status(403).json({ message: 'Forbidden' });
    }

    const review = await Review.findByIdAndDelete(req.params.id);
    if (review) await updateProductRating(review.productId);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
