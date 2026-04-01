const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET /api/settings/payment
router.get('/payment', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'upiNumber' });
    res.json({ upiNumber: setting ? setting.value : '9652300993' });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

// PUT /api/settings/payment
router.put('/payment', async (req, res) => {
  try {
    const { upiNumber } = req.body;
    if (!upiNumber) return res.status(400).json({ message: 'UPI Number required' });
    
    await Setting.findOneAndUpdate(
      { key: 'upiNumber' },
      { value: upiNumber },
      { upsert: true, new: true }
    );
    
    res.json({ message: 'Payment settings updated', upiNumber });
  } catch (err) {
    res.status(500).json({ message: 'Error updating settings' });
  }
});

module.exports = router;
