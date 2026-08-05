/**
 * Controller users — CRUD có kiểm soát phân quyền RBAC.
 *
 *   GET    /users              list (admin/manager)
 *   GET    /users/me           user hiện tại (mọi user đã đăng nhập)
 *   POST   /users              tạo mới (admin/manager)
 *   GET    /users/:id          lấy chi tiết (admin/manager)
 *   PUT    /users/:id          cập nhật (luôn cho chính mình; admin/manager cho người khác)
 *   DELETE /users/:id          xoá (admin/manager; không xoá bản thân; không xoá admin)
 */
const usersService = require('../services/users.service');
const ok = (res, data, message = 'OK') => res.status(200).json({ success: true, message, data });
const created = (res, data, message = 'Created') => res.status(201).json({ success: true, message, data });

async function list(req, res, next) {
  try {
    const users = await usersService.listUsers(req.user);
    return ok(res, { users, count: users.length });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await usersService.getUser(req.user.docId, req.user);
    return ok(res, { user });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const user = await usersService.getUser(req.params.id, req.user);
    if (!user) return res.status(404).json({ success: false, error: 'NotFound', message: 'User not found' });
    return ok(res, { user });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await usersService.createUser(req.body || {}, req.user);
    return created(res, { user }, 'User created');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const user = await usersService.updateUser(req.params.id, req.body || {}, req.user);
    return ok(res, { user }, 'User updated');
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await usersService.deleteUser(req.params.id, req.user);
    return ok(res, result, 'User deleted');
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, me, getOne, create, update, remove };