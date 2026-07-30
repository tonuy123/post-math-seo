/**
 * ============================================================================
 *  Firebase Admin SDK Initialization
 * ============================================================================
 *  Extracted from legacy `script.js` firebaseConfig (web SDK).
 *  In the new architecture the *server* uses the Admin SDK with a service
 *  account JSON file. The web SDK is NOT used here.
 *
 *  firebase-admin v14 flattened its public API — `admin.credential`,
 *  `admin.firestore`, and `admin.auth` are no longer namespaces; the
 *  Firestore / Auth submodules are lazy-required instead.
 * ============================================================================
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;
let _db = null;
let _auth = null;

function initializeFirebase() {
  if (initialized) return admin;

  const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/serviceAccountKey.json'
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(
      `[firebase] WARNING: Service account file not found at "${serviceAccountPath}".\n` +
      `         Download it from Firebase Console > Project Settings > Service Accounts\n` +
      `         and place it there, or set FIREBASE_SERVICE_ACCOUNT_PATH in .env.\n` +
      `         Server will start, but Firestore calls will fail until configured.`
    );
    return null;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  initialized = true;
  console.log(`[firebase] Admin SDK initialized for project: ${serviceAccount.project_id}`);
  return admin;
}

function getDb() {
  if (!initialized) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebase() first.');
  }
  if (!_db) {
    // firebase-admin v14 lazy-loads Firestore
    const { getFirestore } = require('firebase-admin/firestore');
    _db = getFirestore();
  }
  return _db;
}

function getAuth() {
  if (!initialized) {
    throw new Error('Firebase Admin not initialized. Call initializeFirebase() first.');
  }
  if (!_auth) {
    // firebase-admin v14 lazy-loads Auth
    const { getAuth } = require('firebase-admin/auth');
    _auth = getAuth();
  }
  return _auth;
}

module.exports = { initializeFirebase, getDb, getAuth, admin };