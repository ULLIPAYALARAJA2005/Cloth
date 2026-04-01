const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');

// GET /api/coupons — admin: all coupons
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(coupons.map(c => ({
      ...c,
      id: c._id.toString(),
      discountValue: c.amount,
      maxUses: c.usageLimit,
      expiryDate: c.expiry
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/coupons/validate — user validates coupon at checkout
router.post('/validate', async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });
    if (coupon.expiry && new Date(coupon.expiry) < new Date()) return res.status(400).json({ message: 'Coupon expired' });
    if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (orderTotal < coupon.minOrder) return res.status(400).json({ message: `Minimum order value is ₹${coupon.minOrder}` });

    const discount = coupon.discountType === 'percent'
      ? Math.round((orderTotal * coupon.amount) / 100)
      : coupon.amount;

    res.json({ valid: true, discount, coupon: { ...coupon.toObject(), id: coupon._id.toString() } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/coupons — admin creates coupon
router.post('/', async (req, res) => {
  try {
    const { code, discountType, discountValue, amount, expiry, expiryDate, usageLimit, maxUses, minOrder, terms } = req.body;
    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      amount: Number(discountValue || amount),
      expiry: expiryDate || expiry,
      usageLimit: Number(maxUses || usageLimit || 100),
      minOrder: Number(minOrder || 0),
      terms,
    });
    res.status(201).json({ ...coupon.toObject(), id: coupon._id.toString() });
  } catch (err) {
    console.error('Create coupon error:', err);
    res.status(500).json({ message: err.code === 11000 ? 'Coupon code already exists' : 'Server error' });
  }
});

// PUT /api/coupons/:id — admin updates coupon
router.put('/:id', async (req, res) => {
  try {
    const { code, discountType, discountValue, amount, expiry, expiryDate, usageLimit, maxUses, minOrder, terms, active } = req.body;
    const updateData = {};
    if (code) updateData.code = code.toUpperCase();
    if (discountType) updateData.discountType = discountType;
    if (discountValue !== undefined || amount !== undefined) updateData.amount = Number(discountValue || amount);
    if (expiryDate !== undefined || expiry !== undefined) updateData.expiry = expiryDate || expiry;
    if (maxUses !== undefined || usageLimit !== undefined) updateData.usageLimit = Number(maxUses || usageLimit || 100);
    if (minOrder !== undefined) updateData.minOrder = Number(minOrder || 0);
    if (terms !== undefined) updateData.terms = terms;
    if (active !== undefined) updateData.active = active;

    const updated = await Coupon.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ ...updated.toObject(), id: updated._id.toString() });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/coupons/:id — admin deletes coupon
router.delete('/:id', async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
