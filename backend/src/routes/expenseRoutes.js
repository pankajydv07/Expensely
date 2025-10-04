const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../middlewares/uploadMiddleware');
const expenseController = require('../controllers/expenseController');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get categories (must be before /:id route)
router.get('/categories', expenseController.getCategories);

// Expense routes
router.get('/', expenseController.getExpenses);
router.get('/:id', expenseController.getExpense);
router.post('/', upload.single('receipt_file'), expenseController.createExpense);
router.put('/:id', upload.single('receipt_file'), expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);
router.post('/:id/submit', expenseController.submitExpense);

module.exports = router;

