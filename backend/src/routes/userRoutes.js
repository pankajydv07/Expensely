const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin, isManagerOrAdmin } = require('../middlewares/rbacMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

// Validation rules for user creation
const createUserValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
  body('managerId').optional().isUUID().withMessage('Manager ID must be a valid UUID'),
];

// Validation rules for user update
const updateUserValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('role').optional().isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
];

// Get all users (admin only)
router.get('/', protect, isAdmin, userController.getUsers);

// Get user statistics (admin only)
router.get('/stats', protect, isAdmin, userController.getUserStats);

// Get available managers (admin and managers can see)
router.get('/managers', protect, isManagerOrAdmin, userController.getManagers);

// Get user by ID (users can see their own profile, admins can see all)
router.get('/:id', protect, userController.getUser);

// Create user (admin only)
router.post('/', protect, isAdmin, createUserValidation, userController.createUser);

// Update user (users can update their own profile, admins can update all)
router.put('/:id', protect, updateUserValidation, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', protect, isAdmin, userController.deleteUser);

module.exports = router;

