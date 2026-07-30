const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/auth.controller');
const { authRequired } = require('../middlewares/authRequired');

router.post('/login', ctrl.login);
router.get('/me', authRequired, ctrl.me);
router.post('/logout', ctrl.logout);

module.exports = router;