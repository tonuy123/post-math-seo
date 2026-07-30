/**
 * ============================================================================
 *  Auth Middleware
 * ============================================================================
 *  Verifies a Firebase ID token passed as `Authorization: Bearer <token>`.
 *  On success, attaches a normalized `req.user` object:
 *      { uid, email, role, username, avatar }
 *
 *  The `role` / `username` / `avatar` fields come from the matching user
 *  document in Firestore (keyed by `uid`). The mapping `authUid -> username`
 *  lets us keep the legacy `users` collection intact while using real
 *  Firebase Authentication on the client (Phase 3).
 *
 *  NOTE: For the initial Phase 2 build, we also support a **dev login**
 *  fallback where the client posts `{ username, password }` to /auth/login
 *  and receives a short-lived JWT signed by the server. The middleware then
 *  verifies that JWT instead. This keeps the migration smooth: legacy
 *  clients can keep posting username/password, and Phase 3 will switch to
 *  Firebase Auth without server changes.
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
 * Express middleware: verifies the request is authenticated.
 * Accepts either:
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

    // 1) Try Firebase ID token first. Only fall through to JWT if the
    //    *verification* itself fails — NOT if the user lookup fails,
    //    otherwise a valid Firebase token could resolve to a different
    //    account via the JWT branch.
    try {
      claims = await verifyFirebaseIdToken(token);
    } catch (e) {
      fbVerifyError = e;
    }

    if (claims) {
      userDoc = await loadUserDocByField('uid', claims.uid);
    } else {
      // 2) Fall back to server-issued JWT (legacy dev login).
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
      // fbVerifyError is unused in this path; intentionally discarded.
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