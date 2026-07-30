const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/users.controller');
const { authRequired } = require('../middlewares/authRequired');
const { requireRole } = require('../middlewares/requireRole');

const adminManager = requireRole('admin', 'manager');

// All user routes require authentication.
router.use(authRequired);

// Current user (always allowed when authenticated).
router.get('/me', ctrl.me);

// Management endpoints — only admin and manager.
router.get('/', adminManager, ctrl.list);
router.get('/:id', adminManager, ctrl.getOne);
router.post('/', adminManager, ctrl.create);
router.put('/:id', ctrl.update); // service handles self/role rules
router.delete('/:id', adminManager, ctrl.remove);

module.exports = router;