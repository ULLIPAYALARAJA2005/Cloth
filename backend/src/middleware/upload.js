const multer = require('multer');
const path = require('path');
const { getBucket } = require('../config/gridfs');
const { Readable } = require('stream');

// Use memory storage - we'll pipe the buffer to GridFS
const storageConfig = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({
  storage: storageConfig,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

/**
 * Uploads a file buffer to MongoDB GridFS and returns the public URL
 * @param {Object} file - The file object from multer (with buffer)
 * @param {String} folder - Logical folder prefix (not used in GridFS, kept for API compat)
 * @returns {String} URL path like /api/images/:id
 */
const uploadToGridFS = (file, folder = 'products') => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) return resolve(null);

    try {
      const bucket = getBucket();
      const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          originalName: file.originalname,
          mimetype: file.mimetype,
          folder,
        },
        contentType: file.mimetype,
      });

      const readable = Readable.from(file.buffer);
      readable.pipe(uploadStream);

      uploadStream.on('finish', () => {
        // Return an API path that the backend will serve
        resolve(`/api/images/${uploadStream.id}`);
      });

      uploadStream.on('error', (err) => {
        console.error('GridFS upload error:', err);
        reject(err);
      });
    } catch (err) {
      console.error('GridFS bucket error:', err);
      reject(err);
    }
  });
};

// Keep the same export name so existing routes don't need changes
module.exports = { upload, uploadToFirebase: uploadToGridFS };
