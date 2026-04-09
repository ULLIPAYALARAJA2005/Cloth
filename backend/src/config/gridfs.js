const mongoose = require('mongoose');

let gfsBucket = null;

/**
 * Initialize GridFSBucket after mongoose connects.
 * Call this once after connectDB().
 */
const initGridFS = () => {
  const db = mongoose.connection.db;
  gfsBucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  console.log('✅ GridFS bucket initialized');
};

const getBucket = () => {
  if (!gfsBucket) throw new Error('GridFS not initialized. Call initGridFS() first.');
  return gfsBucket;
};

module.exports = { initGridFS, getBucket };
