const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * GET /api/images/:id
 * Serves an image stored in MongoDB GridFS
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid image ID' });
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const db = mongoose.connection.db;
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

    // Check if file exists
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const file = files[0];

    // Set cache headers (1 week)
    res.set('Cache-Control', 'public, max-age=604800');
    res.set('Content-Type', file.contentType || 'image/jpeg');

    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on('error', (err) => {
      console.error('GridFS stream error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'Error streaming image' });
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error('Image serve error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
