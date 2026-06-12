const express = require('express');
const leaveController = require('../controllers/leaveController');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Protected routes (Employees & Managers)
router.post('/request', verifyToken, leaveController.requestLeave);
router.get('/my-leaves', verifyToken, leaveController.getMyLeaves);
router.get('/stats', verifyToken, leaveController.getStats);

// Protected routes (Managers only)
router.get('/all', verifyToken, requireManager, leaveController.getAllLeaves);
router.put('/review/:id', verifyToken, requireManager, leaveController.reviewLeave);
router.get('/manager-stats', verifyToken, requireManager, leaveController.getManagerStats);

module.exports = router;
