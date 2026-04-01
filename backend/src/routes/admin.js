const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalProducts, orders] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.find().lean(),
    ]);

    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const totalOrders = deliveredOrders.length;
    
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const now = new Date();
    const dailyMap = {}, weeklyMap = {}, monthlyMap = {}, yearlyMap = {};
    const statusBreakdown = {};

    orders.forEach(order => {
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
      if (!order.createdAt) return;
      const d = new Date(order.createdAt);
      const dayKey = d.toISOString().split('T')[0];
      const weekKey = `Week ${getWeekNumber(d)}, ${d.getFullYear()}`;
      const monthKey = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      const yearKey = `${d.getFullYear()}`;
      
      const amount = order.totalAmount || 0;
      const isValid = order.status === 'delivered';
      if (isValid) {
        dailyMap[dayKey] = (dailyMap[dayKey] || 0) + amount;
        weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + amount;
        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amount;
        yearlyMap[yearKey] = (yearlyMap[yearKey] || 0) + amount;
      }
    });

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last30Days.push({ date: key, revenue: dailyMap[key] || 0 });
    }
    const last12Weeks = Object.entries(weeklyMap).slice(-12).map(([k, v]) => ({ week: k, revenue: v }));
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
      last12Months.push({ month: key, revenue: monthlyMap[key] || 0 });
    }
    const yearlyData = Object.entries(yearlyMap).map(([k, v]) => ({ year: k, revenue: v }));

    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(o => ({ id: o._id.toString(), userName: o.userName, totalAmount: o.totalAmount, status: o.status, createdAt: o.createdAt }));

    res.json({ totalUsers, totalProducts, totalOrders, totalRevenue, statusBreakdown, recentOrders, charts: { daily: last30Days, weekly: last12Weeks, monthly: last12Months, yearly: yearlyData } });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/inventory
router.get('/inventory', async (req, res) => {
  try {
    const products = await Product.find().lean();
    const inventory = products.map(p => {
      const totalQty = p.hasSizes === false 
        ? (p.quantity || 0) 
        : (p.sizes?.reduce((sum, s) => sum + (s.qty || 0), 0) || 0);

      const formatImage = img => {
        if (!img) return null;
        if (typeof img === 'string') return img.replace(/ /g, '%20');
        if (typeof img === 'object' && img.url) return img.url.replace(/ /g, '%20');
        return null;
      };

      return {
        id: p._id.toString(),
        name: p.name,
        category: p.category,
        sizes: p.sizes || [],
        totalQty,
        outOfStock: totalQty === 0,
        image: formatImage(p.images?.[0]),
      };
    });
    res.json(inventory);
  } catch (err) {
    console.error('Inventory fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    res.json(users.map(u => ({ ...u, id: u._id.toString() })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/admin/reviews/:id
router.put('/reviews/:id', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { rating: Number(rating), comment }, { new: true });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    
    const allReviews = await Review.find({ productId: review.productId });
    const newCount = allReviews.length;
    const avgRating = newCount > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / newCount : 0;
    await Product.findByIdAndUpdate(review.productId, { ratings: Math.round(avgRating * 10) / 10, reviewCount: newCount });
    
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    
    const allReviews = await Review.find({ productId: review.productId });
    const newCount = allReviews.length;
    const avgRating = newCount > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / newCount : 0;
    await Product.findByIdAndUpdate(review.productId, { ratings: Math.round(avgRating * 10) / 10, reviewCount: newCount });
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
