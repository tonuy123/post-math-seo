const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/users.controller');
const { authRequired } = require('../middlewares/authRequired');
const { requireRole } = require('../middlewares/requireRole');

const adminManager = requireRole('admin', 'manager');

// Mọi route user đều yêu cầu xác thực.
router.use(authRequired);

// User hiện tại (luôn được phép khi đã đăng nhập).
router.get('/me', ctrl.me);

// Các endpoint quản lý — chỉ admin và manager.
router.get('/', adminManager, ctrl.list);
router.get('/:id', adminManager, ctrl.getOne);
router.post('/', adminManager, ctrl.create);
router.put('/:id', ctrl.update); // service xử lý quy tắc self/role
router.delete('/:id', adminManager, ctrl.remove);

module.exports = router;