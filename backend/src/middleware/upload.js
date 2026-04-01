const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { storage } = require('../config/firebase');

// Use memory storage for cloud uploads
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
 * Uploads a file buffer to Firebase Storage and returns the public URL
 * @param {Object} file - The file object from multer (with buffer)
 * @param {String} folder - Target folder in bucket
 */
const uploadToFirebase = async (file, folder = 'products') => {
  if (!file || !file.buffer) return null;

  const bucket = storage.bucket();
  const filename = `${folder}/${uuidv4()}-${file.originalname}`;
  const fileRef = bucket.file(filename);

  await fileRef.save(file.buffer, {
    metadata: { contentType: file.mimetype },
    public: true,
  });

  // Return the public URL
  // Format: https://storage.googleapis.com/BUCKET_NAME/FILE_NAME
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
};

module.exports = { upload, uploadToFirebase };
