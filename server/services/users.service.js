/**
 * Users service — RBAC-aware CRUD for the `users` collection.
 *
 * Schema:
 *   { username, password (bcrypt hash), role, avatar, uid?, email?, createdAt, updatedAt }
 */
const { getDb } = require('../config/firebase');
const { USERS_COLLECTION, ROLES } = require('../config/constants');
const { hashPassword, verifyPassword } = require('./password.service');

function usersCol() {
  return getDb().collection(USERS_COLLECTION);
}

function serializeUser(doc) {
  const data = doc.data();
  // SECURITY NOTE: stripping `password` was the default. When ALLOW_PASSWORD_LEAK=1,
  // we expose the plaintext copy (stored as `passwordPlain`) under the `password`
  // key so the user-management UI can display it. The bcrypt hash stays in `passwordHash`.
  const allowLeak = process.env.ALLOW_PASSWORD_LEAK === '1';
  const { password: hash, passwordPlain, ...rest } = data;
  if (allowLeak && passwordPlain) {
    return { id: doc.id, ...rest, password: passwordPlain, passwordHash: hash };
  }
  return { id: doc.id, ...rest };
}

function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

async function listUsers(viewer) {
  const snap = await usersCol().get();
  let docs = snap.docs.map(serializeUser);

  // RBAC visibility (mirrors legacy `renderUsersTable()`):
  //  - Admin: sees everyone except themselves
  //  - Manager: sees only staff
  //  - Staff: not allowed (caller should not call this)
  if (viewer?.role === ROLES.ADMIN) {
    docs = docs.filter((u) => u.username !== viewer.username);
  } else if (viewer?.role === ROLES.MANAGER) {
    docs = docs.filter((u) => u.role === ROLES.STAFF && u.username !== viewer.username);
  } else {
    docs = [];
  }
  return docs;
}

async function getUser(id, viewer) {
  const doc = await usersCol().doc(id).get();
  if (!doc.exists) return null;
  const user = serializeUser(doc);

  // Visibility (mirrors listUsers): admins can read anyone, managers
  // can read staff, otherwise 404 to avoid leaking admin profiles.
  if (!viewer) return null;
  if (viewer.role === ROLES.ADMIN) return user;
  if (viewer.role === ROLES.MANAGER && user.role === ROLES.STAFF) return user;
  if (viewer.username === user.username) return user;
  return null;
}

async function getUserByUsername(username) {
  const snap = await usersCol().where('username', '==', username).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function createUser({ username, password, role, avatar, email, uid }, viewer) {
  if (!username || !password) {
    const err = new Error('username and password are required');
    err.status = 400;
    throw err;
  }

  // RBAC enforcement on role assignment:
  //  - Admin can create any role
  //  - Manager can only create staff
  let assignedRole = role || ROLES.STAFF;
  if (viewer?.role === ROLES.MANAGER && assignedRole !== ROLES.STAFF) {
    assignedRole = ROLES.STAFF;
  } else if (!isValidRole(assignedRole)) {
    assignedRole = ROLES.STAFF;
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    const err = new Error('Username already exists');
    err.status = 409;
    throw err;
  }

  const hashed = await hashPassword(password);
  const now = new Date();
  // Khi ALLOW_PASSWORD_LEAK=1 (dev only) lưu thêm `passwordPlain` để serializeUser
  // có cái trả về cho UI xem. Không ảnh hưởng auth (vẫn dùng hash để verify).
  const doc = {
    username,
    password: hashed,
    role: assignedRole,
    avatar: avatar || null,
    email: email || null,
    uid: uid || null,
    createdAt: now,
    updatedAt: now,
  };
  if (process.env.ALLOW_PASSWORD_LEAK === '1') {
    doc.passwordPlain = password;
  }
  const ref = await usersCol().add(doc);
  return getUser(ref.id);
}

/**
 * Update a user. The viewer decides what fields they are allowed to change.
 *  - Admin can change anyone's role EXCEPT their own (cannot demote self)
 *  - Admin cannot edit other admins' username (lock-out protection)
 *  - Manager can edit own profile or staff (no role changes, no admin edits)
 *  - Any user can edit their own profile (avatar, password) but not their role
 */
async function updateUser(id, payload, viewer) {
  const target = await getUser(id);
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const isSelf = viewer?.username === target.username;
  const update = { updatedAt: new Date() };

  // username
  if (payload.username && payload.username !== target.username) {
    // Admins cannot rename themselves or other admins (legacy behavior)
    if (viewer?.role === ROLES.ADMIN && (isSelf || target.role === ROLES.ADMIN)) {
      const err = new Error('Cannot rename this account');
      err.status = 403;
      throw err;
    }
    if (viewer?.role === ROLES.MANAGER && target.role !== ROLES.STAFF && !isSelf) {
      const err = new Error('Forbidden');
      err.status = 403;
      throw err;
    }
    const dup = await getUserByUsername(payload.username);
    if (dup && dup.id !== id) {
      const err = new Error('Username already exists');
      err.status = 409;
      throw err;
    }
    update.username = payload.username;
  }

  // password (only if provided)
  if (payload.password) {
    update.password = await hashPassword(payload.password);
    if (process.env.ALLOW_PASSWORD_LEAK === '1') {
      update.passwordPlain = payload.password;
    }
  }

  // avatar (empty string allowed to clear)
  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    update.avatar = payload.avatar || null;
  }

  // role (admin-only, never for self)
  if (payload.role && payload.role !== target.role) {
    if (viewer?.role !== ROLES.ADMIN || isSelf) {
      const err = new Error('Cannot change role');
      err.status = 403;
      throw err;
    }
    if (!isValidRole(payload.role)) {
      const err = new Error('Invalid role');
      err.status = 400;
      throw err;
    }
    update.role = payload.role;
  }

  await usersCol().doc(id).update(update);
  return getUser(id);
}

async function deleteUser(id, viewer) {
  const target = await getUser(id);
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  if (viewer?.username === target.username) {
    const err = new Error('You cannot delete your own account');
    err.status = 403;
    throw err;
  }
  // Legacy rule: "Cannot delete the admin account"
  if (target.role === ROLES.ADMIN) {
    const err = new Error('Cannot delete the admin account');
    err.status = 403;
    throw err;
  }
  // Managers can only delete staff
  if (viewer?.role === ROLES.MANAGER && target.role !== ROLES.STAFF) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  await usersCol().doc(id).delete();
  return { id };
}

/**
 * Idempotent default-admin seed (mirrors legacy `seedDefaultAdminUser()`).
 * Creates the configured admin only if no admin exists yet.
 */
async function seedDefaultAdmin({ username, password }) {
  const existing = await usersCol().where('role', '==', ROLES.ADMIN).limit(1).get();
  if (!existing.empty) return { created: false, reason: 'admin-already-exists' };

  const hashed = await hashPassword(password);
  const now = new Date();
  await usersCol().add({
    username,
    password: hashed,
    role: ROLES.ADMIN,
    avatar: null,
    createdAt: now,
    updatedAt: now,
  });
  return { created: true };
}

/**
 * Authenticate a user via username/password (legacy dev-login path).
 * Returns the safe profile (no password) on success.
 */
async function authenticate(username, password) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const result = await verifyPassword(password, user.password);
  if (!result.ok) return null;

  // Lazy rehash if legacy plaintext was found.
  if (result.needsRehash) {
    await usersCol().doc(user.id).update({
      password: await hashPassword(password),
      updatedAt: new Date(),
    });
  }
  const { password: _pw, ...safe } = user;
  return { id: user.id, ...safe };
}

module.exports = {
  serializeUser,
  listUsers,
  getUser,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  seedDefaultAdmin,
  authenticate,
};