const expenseService = require('../services/expenseService');
const ocrService = require('../services/ocrService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError } = require('../middlewares/errorHandler');
const { query } = require('../config/db');
const path = require('path');
const fs = require('fs');

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
    req.user.company_id,
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
    req.user.company_id
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
    [req.user.company_id]
  );

  if (!companyResult.rows || companyResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      message: 'Company not found'
    });
  }

  const companyCurrency = companyResult.rows[0].default_currency;

  // Parse and convert form data fields to match service expectations
  const formData = {
    title: req.body.title,
    categoryId: req.body.category_id ? parseInt(req.body.category_id) : null,
    categoryName: req.body.category_name,
    originalAmount: req.body.original_amount ? parseFloat(req.body.original_amount) : null,
    originalCurrency: req.body.original_currency || 'USD',
    dateOfExpense: req.body.date_of_expense,
    paymentMethod: req.body.payment_method,
    vendor: req.body.vendor,
    description: req.body.description,
  };

  // Validation
  if (!formData.originalAmount || formData.originalAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required'
    });
  }

  if (!formData.dateOfExpense) {
    return res.status(400).json({
      success: false,
      message: 'Date of expense is required'
    });
  }

  if (!formData.categoryId && !formData.categoryName) {
    return res.status(400).json({
      success: false,
      message: 'Category is required'
    });
  }

  const expense = await expenseService.createExpense(
    formData,
    req.user.id,
    req.user.company_id,
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
  console.log('🔄 Update Expense: Raw request body:', req.body);

  // Get company currency
  const companyResult = await query(
    'SELECT default_currency FROM companies WHERE id = $1',
    [req.user.company_id]
  );

  const companyCurrency = companyResult.rows[0].default_currency;

  // Parse and convert form data fields to match service expectations (same as create)
  const formData = {
    title: req.body.title,
    categoryId: req.body.category_id ? parseInt(req.body.category_id) : null,
    categoryName: req.body.category_name,
    originalAmount: req.body.original_amount ? parseFloat(req.body.original_amount) : null,
    originalCurrency: req.body.original_currency || 'USD',
    dateOfExpense: req.body.date_of_expense,
    paymentMethod: req.body.payment_method,
    vendor: req.body.vendor,
    description: req.body.description,
  };

  console.log('🔄 Update Expense: Parsed form data:', formData);

  // Validation - same as create
  if (!formData.originalAmount || formData.originalAmount <= 0 || isNaN(formData.originalAmount)) {
    return res.status(400).json({
      success: false,
      message: 'Valid amount is required'
    });
  }

  const expense = await expenseService.updateExpense(
    req.params.id,
    formData,
    req.user.id,
    req.user.company_id,
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
    req.user.company_id
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
    req.user.company_id
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
    [req.user.company_id]
  );

  res.status(200).json({
    success: true,
    data: result.rows,
  });
});

/**
 * @desc    Upload receipt and extract data using OCR
 * @route   POST /api/expenses/upload-receipt
 * @access  Private
 */
const uploadReceipt = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new AppError('Please upload a receipt image', 400);
  }

  const imagePath = req.file.path;

  try {
    // Extract data using OCR
    const ocrResult = await ocrService.extractExpenseData(imagePath);

    // Get supported currencies for the dropdown
    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    ];

    // Get expense categories for this company
    const categoriesResult = await query(
      'SELECT id, name FROM expense_categories WHERE company_id = $1 ORDER BY name',
      [req.user.company_id]
    );

    const categories = categoriesResult.rows;

    res.status(200).json({
      success: true,
      message: 'Receipt processed successfully',
      data: {
        ocrData: ocrResult.data,
        confidence: ocrResult.confidence,
        currencies,
        categories,
        receiptPath: imagePath,
      },
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    throw error;
  }
});

/**
 * @desc    Get currency conversion preview
 * @route   GET /api/expenses/convert-currency
 * @access  Private
 */
const convertCurrency = asyncHandler(async (req, res, next) => {
  const { amount, fromCurrency, toCurrency } = req.query;

  if (!amount || !fromCurrency || !toCurrency) {
    throw new AppError('Amount, fromCurrency, and toCurrency are required', 400);
  }

  try {
    const exchangeRateService = require('../integrations/exchangeRateApiClient');
    const convertedAmount = await exchangeRateService.convertCurrency(
      parseFloat(amount),
      fromCurrency,
      toCurrency
    );

    res.status(200).json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        originalCurrency: fromCurrency,
        convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        convertedCurrency: toCurrency,
        exchangeRate: convertedAmount / parseFloat(amount),
      },
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    throw new AppError('Failed to convert currency', 500);
  }
});

/**
 * @desc    Get currencies and categories for expense form
 * @route   GET /api/expenses/form-data
 * @access  Private
 */
const getFormData = asyncHandler(async (req, res, next) => {
  // Get supported currencies
  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  ];

  // Get expense categories for this company
  const categoriesResult = await query(
    'SELECT id, name FROM expense_categories WHERE company_id = $1 ORDER BY name',
    [req.user.company_id]
  );

  // Get company default currency
  const companyResult = await query(
    'SELECT default_currency FROM companies WHERE id = $1',
    [req.user.company_id]
  );

  const categories = categoriesResult.rows;
  const defaultCurrency = companyResult.rows[0].default_currency;

  res.status(200).json({
    success: true,
    data: {
      currencies,
      categories,
      defaultCurrency,
    },
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
  uploadReceipt,
  getFormData,
  convertCurrency,
};

