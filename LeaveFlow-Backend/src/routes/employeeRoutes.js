const express = require('express');
const employeeController = require('../controllers/employeeController');
const { verifyToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Protected routes (Managers only)
router.get('/', verifyToken, requireManager, employeeController.getAllEmployees);
router.post('/', verifyToken, requireManager, employeeController.createEmployee);
router.delete('/:id', verifyToken, requireManager, employeeController.deleteEmployee);

module.exports = router;
