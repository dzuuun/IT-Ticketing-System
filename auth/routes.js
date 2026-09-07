const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authenticate } = require('./middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
