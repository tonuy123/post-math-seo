/**
 * ============================================================================
 *  Khởi tạo Firebase Admin SDK
 * ============================================================================
 *  Trích xuất từ firebaseConfig (web SDK) của `script.js` bản cũ.
 *  Trong kiến trúc mới, *server* dùng Admin SDK với file JSON service
 *  account. Web SDK KHÔNG được dùng ở đây.
 *
 *  firebase-admin v14 làm phẳng public API của nó — `admin.credential`,
 *  `admin.firestore`, và `admin.auth` không còn là namespaces nữa; thay
 *  vào đó các submodule Firestore / Auth được require lười (lazy-required).
 *
 *  Service account nạp theo thứ tự ưu tiên:
 *    1. FIREBASE_SERVICE_ACCOUNT_JSON — nội dung JSON dán thẳng vào env var
 *       (chuẩn deploy lên Render.com — không upload được file)
 *    2. FIREBASE_SERVICE_ACCOUNT_B64  — nội dung JSON mã hoá base64
 *    3. FIREBASE_SERVICE_ACCOUNT_PATH — đường dẫn file JSON (local dev)
 * ============================================================================
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;
let _db = null;
let _auth = null;

function loadServiceAccount() {
  // 1) Raw JSON trong env var (Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT_JSON invalid JSON:', e.message);
      return null;
    }
  }
  // 2) Base64 trong env var
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    try {
      return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8'));
    } catch (e) {
      console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT_B64 decode failed:', e.message);
      return null;
    }
  }
  // 3) File (local dev)
  const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/serviceAccountKey.json'
  );
  if (!fs.existsSync(serviceAccountPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  } catch (e) {
    console.warn('[firebase] Service account file unreadable:', e.message);
    return null;
  }
}

function initializeFirebase() {
  if (initialized) return admin;

  const serviceAccount = loadServiceAccount();

  if (!serviceAccount) {
    console.warn(
      `[firebase] WARNING: Service account not found.\n` +
      `         Local dev: place JSON at ${path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/serviceAccountKey.json')}\n` +
      `         Render.com: set FIREBASE_SERVICE_ACCOUNT_JSON (paste raw JSON) or FIREBASE_SERVICE_ACCOUNT_B64 (base64).\n` +
      `         Server will start, but Firestore calls will fail until configured.`
    );
    return null;
  }

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
    // firebase-admin v14 lazy-load Firestore
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
    // firebase-admin v14 lazy-load Auth
    const { getAuth } = require('firebase-admin/auth');
    _auth = getAuth();
  }
  return _auth;
}

module.exports = { initializeFirebase, getDb, getAuth, admin };