const expenseService = require('../services/expenseService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError } = require('../middlewares/errorHandler');
const { query } = require('../config/db');

/**
 * @desc    Get all expenses (filtered by role)
 * @route   GET /api/expenses
 * @access  Private
 */
const getExpenses = asyncHandler(async (req, res, next) => {
  const { status, categoryId, startDate, endDate } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (categoryId) filters.categoryId = parseInt(categoryId);
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const expenses = await expenseService.getExpenses(
    req.user.id,
    req.user.role,
    req.user.companyId,
    filters
  );

  res.status(200).json({
    success: true,
    count: expenses.length,
    data: expenses,
  });
});

/**
 * @desc    Get single expense by ID
 * @route   GET /api/expenses/:id
 * @access  Private
 */
const getExpense = asyncHandler(async (req, res, next) => {
  const expense = await expenseService.getExpenseById(
    req.params.id,
    req.user.id,
    req.user.role,
    req.user.companyId
  );

  res.status(200).json({
    success: true,
    data: expense,
  });
});

/**
 * @desc    Create new expense
 * @route   POST /api/expenses
 * @access  Private
 */
const createExpense = asyncHandler(async (req, res, next) => {
  // Get company currency
  const companyResult = await query(
    'SELECT default_currency FROM companies WHERE id = $1',
    [req.user.companyId]
  );

  const companyCurrency = companyResult.rows[0].default_currency;

  const expense = await expenseService.createExpense(
    req.body,
    req.user.id,
    req.user.companyId,
    companyCurrency
  );

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: expense,
  });
});

/**
 * @desc    Update expense
 * @route   PUT /api/expenses/:id
 * @access  Private
 */
const updateExpense = asyncHandler(async (req, res, next) => {
  // Get company currency
  const companyResult = await query(
    'SELECT default_currency FROM companies WHERE id = $1',
    [req.user.companyId]
  );

  const companyCurrency = companyResult.rows[0].default_currency;

  const expense = await expenseService.updateExpense(
    req.params.id,
    req.body,
    req.user.id,
    req.user.companyId,
    companyCurrency
  );

  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: expense,
  });
});

/**
 * @desc    Submit expense for approval
 * @route   POST /api/expenses/:id/submit
 * @access  Private
 */
const submitExpense = asyncHandler(async (req, res, next) => {
  const result = await expenseService.submitExpense(
    req.params.id,
    req.user.id,
    req.user.companyId
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * @desc    Delete expense
 * @route   DELETE /api/expenses/:id
 * @access  Private
 */
const deleteExpense = asyncHandler(async (req, res, next) => {
  const result = await expenseService.deleteExpense(
    req.params.id,
    req.user.id,
    req.user.companyId
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/**
 * @desc    Get expense categories
 * @route   GET /api/expenses/categories
 * @access  Private
 */
const getCategories = asyncHandler(async (req, res, next) => {
  const result = await query(
    'SELECT * FROM expense_categories WHERE company_id = $1 ORDER BY name',
    [req.user.companyId]
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

module.exports = {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  submitExpense,
  deleteExpense,
  getCategories,
};

