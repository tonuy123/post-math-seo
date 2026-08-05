/**
 * Controller auth — đăng nhập, lấy user hiện tại (me).
 *
 * Lưu ý: app monolithic cũ không có endpoint logout thực sự (nó chỉ xoá
 * localStorage). Client Phase 3 sẽ tự xoá session của mình; server vẫn
 * stateless. Chúng ta vẫn expose /auth/logout để đối xứng — nó chỉ
 * trả về 204 để client có thể dùng làm hook nếu muốn.
 */
const usersService = require('../services/users.service');
const { signSessionToken } = require('../middlewares/authRequired');
const ok = (res, data, message = 'OK') => res.status(200).json({ success: true, message, data });

async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'BadRequest', message: 'username and password required' });
    }
    const user = await usersService.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid username or password' });
    }
    const token = signSessionToken({
      uid: user.uid || user.id,
      username: user.username,
      role: user.role,
    });
    return ok(res, { token, user }, 'Login successful');
  } catch (err) {
    return next(err);
  }
}

async function me(req, res) {
  return ok(res, { user: req.user });
}

async function logout(req, res) {
  // Server stateless — client tự vứt token. Endpoint tồn tại cho sự đối xứng.
  return res.status(204).send();
}

module.exports = { login, me, logout };