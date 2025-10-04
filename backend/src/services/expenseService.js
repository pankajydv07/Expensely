const { query, transaction } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const { convertCurrency } = require('../integrations/exchangeRateApiClient');

/**
 * Get all expenses for a user (filtered by role)
 */
const getExpenses = async (userId, userRole, companyId, filters = {}) => {
  let whereClause = 'WHERE e.company_id = $1';
  const params = [companyId];
  let paramIndex = 2;

  // Role-based filtering
  if (userRole === 'employee') {
    whereClause += ` AND e.requester_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  } else if (userRole === 'manager') {
    // Managers can see their team's expenses
    whereClause += ` AND (e.requester_id = $${paramIndex} OR e.requester_id IN (
      SELECT user_id FROM manager_relationships WHERE manager_id = $${paramIndex}
    ))`;
    params.push(userId);
    paramIndex++;
  }
  // Admins can see all company expenses (no additional filter)

  // Additional filters
  if (filters.status) {
    whereClause += ` AND e.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.categoryId) {
    whereClause += ` AND e.category_id = $${paramIndex}`;
    params.push(filters.categoryId);
    paramIndex++;
  }

  if (filters.startDate) {
    whereClause += ` AND e.date_of_expense >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    whereClause += ` AND e.date_of_expense <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }

  const result = await query(
    `SELECT 
      e.*,
      u.name as requester_name,
      u.email as requester_email,
      c.name as category_name,
      (SELECT COUNT(*) FROM expense_attachments WHERE expense_id = e.id) as attachment_count
     FROM expenses e
     LEFT JOIN users u ON e.requester_id = u.id
     LEFT JOIN expense_categories c ON e.category_id = c.id
     ${whereClause}
     ORDER BY e.submitted_at DESC`,
    params
  );

  return result.rows;
};

/**
 * Get single expense by ID
 */
const getExpenseById = async (expenseId, userId, userRole, companyId) => {
  const result = await query(
    `SELECT 
      e.*,
      u.name as requester_name,
      u.email as requester_email,
      c.name as category_name
     FROM expenses e
     LEFT JOIN users u ON e.requester_id = u.id
     LEFT JOIN expense_categories c ON e.category_id = c.id
     WHERE e.id = $1 AND e.company_id = $2`,
    [expenseId, companyId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const expense = result.rows[0];

  // Check access permissions
  if (userRole === 'employee' && expense.requester_id !== userId) {
    throw new AppError('Access denied', 403);
  }

  if (userRole === 'manager') {
    // Check if requester is in manager's team
    const teamCheck = await query(
      'SELECT 1 FROM manager_relationships WHERE user_id = $1 AND manager_id = $2',
      [expense.requester_id, userId]
    );
    
    if (expense.requester_id !== userId && teamCheck.rows.length === 0) {
      throw new AppError('Access denied', 403);
    }
  }

  // Get attachments
  const attachments = await query(
    'SELECT * FROM expense_attachments WHERE expense_id = $1',
    [expenseId]
  );

  expense.attachments = attachments.rows;

  return expense;
};

/**
 * Create a new expense (draft)
 */
const createExpense = async (expenseData, userId, companyId, companyCurrency) => {
  const {
    title,
    categoryId,
    originalAmount,
    originalCurrency,
    dateOfExpense,
    paymentMethod,
    vendor,
    description,
  } = expenseData;

  // Convert currency if needed
  const conversion = await convertCurrency(
    originalAmount,
    originalCurrency,
    companyCurrency
  );

  const result = await query(
    `INSERT INTO expenses (
      company_id, requester_id, title, category_id,
      original_amount, original_currency,
      company_amount, company_currency, exchange_rate_used,
      date_of_expense, payment_method, vendor, description,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
    RETURNING *`,
    [
      companyId,
      userId,
      title,
      categoryId,
      originalAmount,
      originalCurrency,
      conversion.convertedAmount,
      companyCurrency,
      conversion.rate,
      dateOfExpense,
      paymentMethod,
      vendor,
      description,
    ]
  );

  // Create audit log
  await query(
    `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, 'CREATE_EXPENSE', 'expense', $3, $4)`,
    [companyId, userId, result.rows[0].id.toString(), JSON.stringify({ title, amount: originalAmount })]
  );

  return result.rows[0];
};

/**
 * Update expense (only draft expenses)
 */
const updateExpense = async (expenseId, expenseData, userId, companyId, companyCurrency) => {
  // Check if expense exists and is in draft status
  const existing = await query(
    'SELECT * FROM expenses WHERE id = $1 AND company_id = $2',
    [expenseId, companyId]
  );

  if (existing.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const expense = existing.rows[0];

  if (expense.requester_id !== userId) {
    throw new AppError('Access denied', 403);
  }

  if (expense.status !== 'draft') {
    throw new AppError('Only draft expenses can be edited', 400);
  }

  const {
    title,
    categoryId,
    originalAmount,
    originalCurrency,
    dateOfExpense,
    paymentMethod,
    vendor,
    description,
  } = expenseData;

  // Convert currency if amount or currency changed
  let conversion = {
    convertedAmount: expense.company_amount,
    rate: expense.exchange_rate_used,
  };

  if (originalAmount !== expense.original_amount || originalCurrency !== expense.original_currency) {
    conversion = await convertCurrency(originalAmount, originalCurrency, companyCurrency);
  }

  const result = await query(
    `UPDATE expenses SET
      title = $1, category_id = $2,
      original_amount = $3, original_currency = $4,
      company_amount = $5, exchange_rate_used = $6,
      date_of_expense = $7, payment_method = $8,
      vendor = $9, description = $10,
      updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
    [
      title,
      categoryId,
      originalAmount,
      originalCurrency,
      conversion.convertedAmount,
      conversion.rate,
      dateOfExpense,
      paymentMethod,
      vendor,
      description,
      expenseId,
    ]
  );

  return result.rows[0];
};

/**
 * Submit expense for approval
 */
const submitExpense = async (expenseId, userId, companyId) => {
  const expense = await query(
    'SELECT * FROM expenses WHERE id = $1 AND company_id = $2',
    [expenseId, companyId]
  );

  if (expense.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const exp = expense.rows[0];

  if (exp.requester_id !== userId) {
    throw new AppError('Access denied', 403);
  }

  if (exp.status !== 'draft') {
    throw new AppError('Expense has already been submitted', 400);
  }

  // TODO: Create approval workflow based on approval rules
  // For now, just update status to waiting_approval
  
  await query(
    `UPDATE expenses SET status = 'waiting_approval', submitted_at = NOW()
     WHERE id = $1`,
    [expenseId]
  );

  // Create audit log
  await query(
    `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id)
     VALUES ($1, $2, 'SUBMIT_EXPENSE', 'expense', $3)`,
    [companyId, userId, expenseId.toString()]
  );

  // TODO: Notify approvers

  return { message: 'Expense submitted for approval' };
};

/**
 * Delete expense (only drafts)
 */
const deleteExpense = async (expenseId, userId, companyId) => {
  const expense = await query(
    'SELECT * FROM expenses WHERE id = $1 AND company_id = $2',
    [expenseId, companyId]
  );

  if (expense.rows.length === 0) {
    throw new AppError('Expense not found', 404);
  }

  const exp = expense.rows[0];

  if (exp.requester_id !== userId) {
    throw new AppError('Access denied', 403);
  }

  if (exp.status !== 'draft') {
    throw new AppError('Only draft expenses can be deleted', 400);
  }

  await query('DELETE FROM expenses WHERE id = $1', [expenseId]);

  return { message: 'Expense deleted successfully' };
};

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  submitExpense,
  deleteExpense,
};

