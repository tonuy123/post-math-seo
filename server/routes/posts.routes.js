const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/posts.controller');
const { authRequired } = require('../middlewares/authRequired');
const { requireRole } = require('../middlewares/requireRole');

const managerRoles = requireRole('admin', 'manager', 'staff');
const adminOnly = requireRole('admin');

// === Public routes (no auth) — must be registered BEFORE router.use(authRequired) ===
// Trả về CHỈ những bài có status='published'. Không nhận status param từ client.
router.get('/public', ctrl.listPublic);
router.get('/public/:slug', ctrl.getPublicBySlug);

// All other post routes require authentication.
router.use(authRequired);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

// Mutating endpoints — only roles allowed to manage posts.
router.post('/', managerRoles, ctrl.create);
router.put('/:id', managerRoles, ctrl.update);
router.post('/:id/trash', managerRoles, ctrl.trash);
router.post('/:id/restore', managerRoles, ctrl.restore);
router.delete('/:id', managerRoles, ctrl.permanentDelete);
router.post('/bulk', managerRoles, ctrl.bulk);

// Auto-clean is admin-only (it deletes data permanently).
router.post('/auto-clean', adminOnly, ctrl.autoClean);

module.exports = router;