const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');
require('dotenv').config();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const token = jwt.sign(
      { uid: user._id.toString(), email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(201).json({ token, user: { uid: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { uid: user._id.toString(), email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token, user: { uid: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user.resetOTP = otp;
    user.resetOTPExpires = otpExpires;
    await user.save();

    await sendEmail({
      to: user.email,
      subject: 'Your Password Reset OTP - Kalyani Fashion Hub',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
          <h2 style="color: #4f46e5;">Password Reset Request</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your password. Use the following 6-digit code to verify your identity:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #9ca3af;">Kalyani Fashion Hub Team</p>
        </div>
      `
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

    const user = await User.findOne({ email, resetOTP: otp, resetOTPExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    // Generate a temporary reset token valid for 5 mins
    const resetToken = jwt.sign({ email: user.email, type: 'reset' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    
    res.json({ message: 'OTP Verified', token: resetToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'reset') return res.status(400).json({ message: 'Invalid token type' });
    
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate(
      { email: decoded.email }, 
      { 
        passwordHash,
        $unset: { resetOTP: 1, resetOTPExpires: 1 }
      }
    );
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Invalid or expired reset token' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.uid).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, phone } = req.body;
    await User.findByIdAndUpdate(req.user.uid, { name, phone });
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/address — add new address
router.post('/address', require('../middleware/auth'), async (req, res) => {
  try {
    const { label, street, city, state, pincode, mobile1, mobile2, isDefault } = req.body;
    const user = await User.findById(req.user.uid);
    let addresses = user.addresses || [];
    if (isDefault) addresses = addresses.map(a => ({ ...a.toObject(), isDefault: false }));
    const address = { id: Date.now().toString(), label, street, city, state, pincode, mobile1, mobile2, isDefault };
    addresses.push(address);
    await User.findByIdAndUpdate(req.user.uid, { addresses });
    res.json({ message: 'Address added', address });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/address/:addressId — update existing address
router.put('/address/:addressId', require('../middleware/auth'), async (req, res) => {
  try {
    const { label, street, city, state, pincode, mobile1, mobile2, isDefault } = req.body;
    const user = await User.findById(req.user.uid);
    let addresses = (user.addresses || []).map(a => {
      if (a.id === req.params.addressId) {
        return { ...a.toObject(), label, street, city, state, pincode, mobile1, mobile2, isDefault };
      }
      if (isDefault) return { ...a.toObject(), isDefault: false };
      return a;
    });
    await User.findByIdAndUpdate(req.user.uid, { addresses });
    res.json({ message: 'Address updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/auth/address/:addressId
router.delete('/address/:addressId', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.uid);
    const addresses = (user.addresses || []).filter(a => a.id !== req.params.addressId);
    await User.findByIdAndUpdate(req.user.uid, { addresses });
    res.json({ message: 'Address deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
