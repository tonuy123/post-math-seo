/**
 * ============================================================================
 *  Middleware Auth
 * ============================================================================
 *  Xác minh Firebase ID token truyền qua `Authorization: Bearer <token>`.
 *  Khi thành công, gắn đối tượng `req.user` đã chuẩn hoá:
 *      { uid, email, role, username, avatar }
 *
 *  Các field `role` / `username` / `avatar` lấy từ user document tương ứng
 *  trong Firestore (khoá theo `uid`). Ánh xạ `authUid -> username` giúp
 *  giữ nguyên collection `users` cũ trong khi client dùng Firebase
 *  Authentication thật (Phase 3).
 *
 *  LƯU Ý: Với bản dựng Phase 2 ban đầu, chúng ta cũng hỗ trợ fallback
 *  **dev login** khi client gửi `{ username, password }` tới /auth/login
 *  và nhận về JWT ngắn hạn do server ký. Middleware sau đó xác minh JWT
 *  này thay cho Firebase. Điều này giúp migration trơn tru: client cũ
 *  vẫn gửi username/password như trước, và Phase 3 sẽ chuyển sang
 *  Firebase Auth mà không cần sửa server.
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { getAuth, getDb } = require('../config/firebase');
const { USERS_COLLECTION } = require('../config/constants');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

function signSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function verifyFirebaseIdToken(idToken) {
  if (!getAuth) throw new Error('Firebase Admin not initialized');
  return await getAuth().verifyIdToken(idToken);
}

async function loadUserDocByField(field, value) {
  const db = getDb();
  const snap = await db.collection(USERS_COLLECTION).where(field, '==', value).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Express middleware: xác minh request đã được xác thực.
 * Chấp nhận một trong hai:
 *   1. `Authorization: Bearer <firebaseIdToken>`
 *   2. `Authorization: Bearer <jwtIssuedByServer>`
 */
async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header',
      });
    }

    let claims = null;
    let userDoc = null;
    let fbVerifyError = null;

    // 1) Thử Firebase ID token trước. Chỉ fallback sang JWT nếu bản thân
    //    bước *xác minh* thất bại — KHÔNG phải khi tra cứu user thất bại,
    //    nếu không một Firebase token hợp lệ có thể trỏ tới một
    //    tài khoản khác qua nhánh JWT.
    try {
      claims = await verifyFirebaseIdToken(token);
    } catch (e) {
      fbVerifyError = e;
    }

    if (claims) {
      userDoc = await loadUserDocByField('uid', claims.uid);
    } else {
      // 2) Fallback sang JWT do server phát hành (dev login kế thừa bản cũ).
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userDoc = await loadUserDocByField('username', decoded.username);
      } catch (_jwtErr) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      }
      // fbVerifyError không dùng ở nhánh này; cố ý bỏ qua.
      void fbVerifyError;
    }

    if (!userDoc) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No matching user profile',
      });
    }

    req.user = {
      uid: claims?.uid || userDoc.uid || userDoc.id,
      username: userDoc.username,
      role: userDoc.role,
      avatar: userDoc.avatar || null,
      email: claims?.email || userDoc.email || null,
      docId: userDoc.id,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  authRequired,
  signSessionToken,
  JWT_SECRET,
};