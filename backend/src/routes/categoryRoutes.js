const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin, isManagerOrAdmin } = require('../middlewares/rbacMiddleware');
const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all categories for the user's company
router.get('/', getCategories);

// Create a new category (authenticated users)
router.post('/', addCategory);

// Update a category (manager or admin)
router.put('/:id', isManagerOrAdmin, updateCategory);

// Delete a category (manager or admin)
router.delete('/:id', isManagerOrAdmin, deleteCategory);

module.exports = router;

