const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const { initGridFS } = require('./src/config/gridfs');
require('dotenv').config();

const app = express();

// Connect to MongoDB, then initialize GridFS
connectDB().then(() => {
  // Wait for mongoose to be fully connected before initializing GridFS
  if (mongoose.connection.readyState === 1) {
    initGridFS();
  } else {
    mongoose.connection.once('open', () => {
      initGridFS();
    });
  }
}).catch(() => {
  // connectDB swallows errors, so also hook on the connection event
  mongoose.connection.once('open', () => {
    initGridFS();
  });
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));

// CORS CONFIG
app.use(cors({
  origin: [
    process.env.USER_FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/wishlist', require('./src/routes/wishlist'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/coupons', require('./src/routes/coupons'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/images', require('./src/routes/images'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', db: 'MongoDB Atlas', timestamp: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on port ${PORT}`);
  console.log(`   User frontend: ${process.env.USER_FRONTEND_URL}`);
  console.log(`   Admin frontend: ${process.env.ADMIN_FRONTEND_URL}\n`);
});

module.exports = app;
