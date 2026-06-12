const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;
