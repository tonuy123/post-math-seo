/**
 * API Router (v1)
 *
 * Aggregates feature routers under /api/v1.
 */

const express = require('express');
const router = express.Router();

router.use('/auth',  require('./auth.routes'));
router.use('/posts', require('./posts.routes'));
router.use('/users', require('./users.routes'));

router.get('/', (req, res) => {
  res.json({
    api: 'cms-api',
    version: 'v1',
    status: 'live',
    routes: ['/auth', '/posts', '/users'],
  });
});

module.exports = router;