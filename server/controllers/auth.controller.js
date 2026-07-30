/**
 * Auth controller — login, get current user (me).
 *
 * Note: the legacy monolithic app had no real logout endpoint (it just
 * cleared localStorage). Phase 3 client will clear its own session; the
 * server stays stateless. We still expose /auth/logout for symmetry — it
 * simply returns 204 so the client can use it as a hook if desired.
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
  // Stateless server — client drops its token. Endpoint exists for parity.
  return res.status(204).send();
}

module.exports = { login, me, logout };