const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const authMiddleware = require('../middleware/auth');
const { upload, uploadToFirebase } = require('../middleware/upload');
const { sendEmail } = require('../utils/email');
const { generateInvoice } = require('../utils/pdfGenerator');

const formatOrder = (o) => {
  const obj = o.toObject ? o.toObject() : o;
  
  const formatImage = img => {
    if (typeof img === 'string') return img.replace(/ /g, '%20');
    if (img && typeof img === 'object' && img.url) return { ...img, url: img.url.replace(/ /g, '%20') };
    return img;
  };

  return {
    ...obj,
    id: obj._id?.toString() || obj.id,
    items: (obj.items || []).map(item => ({ ...item, image: formatImage(item.image) })),
    paymentProof: obj.paymentProof ? obj.paymentProof.replace(/ /g, '%20') : obj.paymentProof,
  };
};

// POST /api/orders — user creates order
router.post('/', authMiddleware, upload.single('paymentProof'), async (req, res) => {
  try {
    const { items, transactionId, phone, address, couponCode, totalAmount } = req.body;
    let paymentProofUrl = null;
    if (req.file) paymentProofUrl = await uploadToFirebase(req.file, 'payment-proofs');

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;

    const order = await Order.create({
      userId: req.user.uid,
      userName: req.user.name,
      userEmail: req.user.email,
      items: parsedItems,
      totalAmount: Number(totalAmount),
      paymentProof: paymentProofUrl,
      transactionId,
      phone,
      address: parsedAddress,
      couponCode: couponCode || null,
      status: 'pending',
      statusHistory: [{ status: 'pending', timestamp: new Date().toISOString() }],
    });

    // Update inventory
    for (const item of parsedItems) {
      if (!item.productId) continue;
      const p = await Product.findById(item.productId);
      if (p && p.hasSizes === false) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.quantity }
        });
      } else if (p) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { [`sizes.$[el].qty`]: -item.quantity }
        }, { arrayFilters: [{ 'el.size': item.size }] });
      }
    }

    if (couponCode) {
      await Coupon.findOneAndUpdate({ code: couponCode.toUpperCase() }, { $inc: { usedCount: 1 } });
    }

    res.status(201).json(formatOrder(order));
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/orders/my — current user's orders
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.uid, userDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    res.json(orders.map(o => formatOrder(o)));
  } catch (err) {
    console.error('Get my orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/cancel — user cancel pending order
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden' });
    if (order.status !== 'pending') return res.status(400).json({ message: 'Only pending orders can be cancelled' });

    order.statusHistory.push({ status: 'cancelled', timestamp: new Date().toISOString() });
    order.status = 'cancelled';
    await order.save();

    // Restore inventory
    for (const item of order.items) {
      if (!item.productId) continue;
      const p = await Product.findById(item.productId);
      if (p && p.hasSizes === false) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity }
        });
      } else if (p) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { [`sizes.$[el].qty`]: item.quantity }
        }, { arrayFilters: [{ 'el.size': item.size }] });
      }
    }
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders — admin: all orders
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    let orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    const total = orders.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = orders.slice(start, start + Number(limit)).map(o => formatOrder(o));
    res.json({ orders: paginated, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('Get all orders error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/status — admin update order status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.statusHistory.push({ status, timestamp: new Date().toISOString() });
    order.status = status;
    if (status === 'rejected' && reason) order.rejectionReason = reason;
    if (status === 'delivered') order.deliveredAt = new Date().toISOString();
    if (status === 'confirmed') order.confirmedAt = new Date().toISOString();
    if (status === 'shipped') order.shippedAt = new Date().toISOString();
    await order.save();

    // Send email to user
    await sendEmail({
      to: order.userEmail,
      subject: `Order Update: Your order is now ${status.toUpperCase()}!`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; color: #333;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f46e5; margin: 0;">Order Status Update</h2>
            <p style="color: #6b7280;">Kalyani Fashion Hub</p>
          </div>
          
          <p>Hello <strong>${order.userName}</strong>,</p>
          <p>Great news! The status of your order <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong> has been updated to:</p>
          
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; font-size: 18px; font-weight: bold; color: #1e40af; text-transform: uppercase;">
            ${status}
          </div>
          
          <p>Summary of your items:</p>
          <ul style="list-style: none; padding: 0;">
            ${(order.items || []).map(item => `
              <li style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center;">
                <div>
                  <div style="font-weight: bold;">${item.name}</div>
                  <div style="font-size: 12px; color: #6b7280;">Size: ${item.size} | Color: ${item.color} | Qty: ${item.quantity}</div>
                </div>
              </li>
            `).join('')}
          </ul>
          
          <div style="margin-top: 25px; padding-top: 15px; border-top: 2px solid #eee;">
            <p style="font-weight: bold; margin: 0;">Total Amount: ₹${order.totalAmount.toLocaleString()}</p>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #4b5563;">You can track your order further on our website dashboard.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Kalyani Fashion Hub Team</p>
        </div>
      `
    });

    res.json({ message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/orders/:id — admin deletes an order
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id — single order
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden' });
    res.json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/orders/:id/invoice — download invoice PDF
router.get('/:id/invoice', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);

    generateInvoice(order, res);
  } catch (err) {
    console.error('Invoice generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server error' });
    }
  }
});

// GET /api/orders/stats/new-count
router.get('/stats/new-count', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.uid);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const count = await Order.countDocuments({ createdAt: { $gt: user.lastOrdersViewAt || new Date(0) } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/orders/stats/mark-seen
router.post('/stats/mark-seen', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.uid, { lastOrdersViewAt: new Date() });
    res.json({ message: 'Orders marked as seen' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/orders/:id/user-delete — logical delete for user
router.put('/:id/user-delete', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.userId !== req.user.uid) return res.status(403).json({ message: 'Forbidden' });
    
    order.userDeleted = true;
    await order.save();
    res.json({ message: 'Order removed from history' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
