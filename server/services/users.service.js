/**
 * Service users — CRUD có kiểm soát phân quyền RBAC cho collection `users`.
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
  // LƯU Ý BẢO MẬT: mặc định loại bỏ trường `password`. Khi ALLOW_PASSWORD_LEAK=1,
  // chúng ta phơi bản sao plaintext (lưu trong `passwordPlain`) dưới key `password`
  // để UI quản lý user hiển thị được. Hash bcrypt vẫn nằm trong `passwordHash`.
  const allowLeak = process.env.ALLOW_PASSWORD_LEAK === '1';
  const { password: hash, passwordPlain, ...rest } = data;
  // Quy ước: dùng `username` làm `id` công khai cho API. Id của document
  // Firestore (thường là Firebase UID) được giữ trong `firebaseUid` để
  // dùng nội bộ (auth, tra cứu). Nhờ vậy `PUT /users/:id` tìm theo username
  // nhất quán ở list / get / update / delete.
  const publicId = data.username || doc.id;
  if (allowLeak && passwordPlain) {
    return { id: publicId, firebaseUid: doc.id, ...rest, password: passwordPlain, passwordHash: hash };
  }
  return { id: publicId, firebaseUid: doc.id, ...rest };
}

function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

async function listUsers(viewer) {
  const snap = await usersCol().get();
  let docs = snap.docs.map(serializeUser);

  // Phạm vi hiển thị theo RBAC (mirror lại `renderUsersTable()` bản cũ):
  //  - Admin: thấy mọi người trừ chính mình
  //  - Manager: chỉ thấy staff
  //  - Staff: không được phép (caller không nên gọi hàm này)
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
  if (!id) return null;
  // Thử tìm theo document id trước (Firebase UID), rồi fallback sang username
  // theo quy ước API công khai. Nhờ vậy cả caller cũ (UID) lẫn mới
  // (username) đều hoạt động.
  let doc = await usersCol().doc(id).get();
  if (!doc.exists) {
    const byUsername = await usersCol().where('username', '==', id).limit(1).get();
    if (byUsername.empty) return null;
    doc = byUsername.docs[0];
  }
  const user = serializeUser(doc);

  // TẠM: log để chẩn đoán lỗi 404
  // eslint-disable-next-line no-console
  console.log('[getUser] id=', id, 'viewer=', JSON.stringify(viewer), 'targetRole=', user.role);

  if (!viewer) return null;
  // Bất kỳ user đã đăng nhập nào cũng có thể cập nhật profile của mình…
  if (viewer.username === user.username) return user;
  // …admin có thể cập nhật bất kỳ ai…
  if (viewer.role === ROLES.ADMIN) return user;
  // …manager có thể cập nhật staff.
  if (viewer.role === ROLES.MANAGER && user.role === ROLES.STAFF) return user;
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

  // Áp dụng RBAC khi gán role:
  //  - Admin được tạo mọi role
  //  - Manager chỉ được tạo staff
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
 * Cập nhật user. Viewer quyết định những field nào họ được phép thay đổi.
 *  - Admin được đổi role của bất kỳ ai NGOẠI TRỪ chính mình (không thể tự hạ cấp)
 *  - Admin không được sửa username của admin khác (chống khoá tài khoản)
 *  - Manager được sửa profile của mình hoặc staff (không đổi role, không sửa admin)
 *  - Mọi user đều sửa được profile của mình (avatar, password) nhưng không đổi role
 */
async function updateUser(id, payload, viewer) {
  const target = await getUser(id, viewer);
  if (!target) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const isSelf = viewer?.username === target.username;
  const update = { updatedAt: new Date() };

  // username
  if (payload.username && payload.username !== target.username) {
    // Admin không thể đổi tên chính mình hoặc admin khác (hành vi kế thừa bản cũ)
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

  // password (chỉ khi được cung cấp)
  if (payload.password) {
    update.password = await hashPassword(payload.password);
    if (process.env.ALLOW_PASSWORD_LEAK === '1') {
      update.passwordPlain = payload.password;
    }
  }

  // avatar (chuỗi rỗng được phép để xoá)
  if (Object.prototype.hasOwnProperty.call(payload, 'avatar')) {
    update.avatar = payload.avatar || null;
  }

  // role (chỉ admin, không bao giờ cho chính mình)
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

  await usersCol().doc(target.firebaseUid).update(update);
  return getUser(id);
}

async function deleteUser(id, viewer) {
  const target = await getUser(id, viewer);
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
  // Quy tắc kế thừa: "Không thể xoá tài khoản admin"
  if (target.role === ROLES.ADMIN) {
    const err = new Error('Cannot delete the admin account');
    err.status = 403;
    throw err;
  }
  // Manager chỉ được xoá staff
  if (viewer?.role === ROLES.MANAGER && target.role !== ROLES.STAFF) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  await usersCol().doc(target.firebaseUid).delete();
  return { id };
}

/**
 * Seed admin mặc định đảm bảo idempotent (mirror lại `seedDefaultAdminUser()` bản cũ).
 * Chỉ tạo admin đã cấu hình khi chưa tồn tại admin nào.
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
 * Xác thực user qua username/password (đường dẫn dev-login kế thừa bản cũ).
 * Trả về profile an toàn (không kèm password) khi thành công.
 */
async function authenticate(username, password) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const result = await verifyPassword(password, user.password);
  if (!result.ok) return null;

  // Rehash trễ nếu phát hiện plaintext kế thừa từ bản cũ.
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