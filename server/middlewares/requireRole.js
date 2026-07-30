/**
 * RBAC guard.
 * Usage:  router.post('/foo', authRequired, requireRole('admin'), handler)
 *         router.get('/bar',  authRequired, requireRole('admin', 'manager'), handler)
 */
function requireRole(...allowed) {
  const allowedSet = new Set(allowed);
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Login required' });
    }
    if (!allowedSet.has(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Requires one of roles: ${[...allowedSet].join(', ')}`,
      });
    }
    return next();
  };
}

module.exports = { requireRole };