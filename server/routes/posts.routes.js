const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/posts.controller');
const { authRequired } = require('../middlewares/authRequired');
const { requireRole } = require('../middlewares/requireRole');

const managerRoles = requireRole('admin', 'manager', 'staff');
const adminOnly = requireRole('admin');

// === Routes công khai (không cần auth) — phải đăng ký TRƯỚC router.use(authRequired) ===
// Trả về CHỈ những bài có status='published'. Không nhận status param từ client.
router.get('/public', ctrl.listPublic);
router.get('/public/:slug', ctrl.getPublicBySlug);

// Mọi route post khác đều yêu cầu xác thực.
router.use(authRequired);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

// Các endpoint thay đổi dữ liệu — chỉ role được phép quản lý posts.
router.post('/', managerRoles, ctrl.create);
router.put('/:id', managerRoles, ctrl.update);
router.post('/:id/trash', managerRoles, ctrl.trash);
router.post('/:id/restore', managerRoles, ctrl.restore);
router.delete('/:id', managerRoles, ctrl.permanentDelete);
router.post('/bulk', managerRoles, ctrl.bulk);

// Auto-clean chỉ dành cho admin (nó xoá dữ liệu vĩnh viễn).
router.post('/auto-clean', adminOnly, ctrl.autoClean);

module.exports = router;