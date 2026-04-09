const admin = require('firebase-admin');
require('dotenv').config();

const hasRequiredFirebaseVars = 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_CLIENT_EMAIL && 
  process.env.FIREBASE_PRIVATE_KEY;

if (hasRequiredFirebaseVars) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
} else {
  console.warn('\n⚠️  Firebase credentials missing. Firebase features will be mocked for local development.\n');
}

const db = hasRequiredFirebaseVars ? admin.firestore() : null;
const storage = hasRequiredFirebaseVars ? admin.storage() : {
  bucket: () => ({
    file: () => ({
      save: async () => { console.log('Mock: File saved to cloud (skipped)'); },
      name: 'mock-bucket',
    }),
    name: 'mock-bucket',
  })
};
const auth = hasRequiredFirebaseVars ? admin.auth() : null;

module.exports = { admin, db, storage, auth };

