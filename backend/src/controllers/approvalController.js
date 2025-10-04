const approvalService = require('../services/approvalService');

// Get pending approvals for current user (managers only)
const getPendingApprovals = async (req, res) => {
  try {
    const { id: userId, company_id: companyId } = req.user;

    const approvals = await approvalService.getPendingApprovals(userId, companyId);

    res.json({
      success: true,
      data: approvals,
      message: 'Pending approvals retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending approvals'
    });
  }
};

/**
 * @desc    Get expenses for approval dashboard with filters
 * @route   GET /api/approval/expenses
 * @access  Private (Managers/Admins only)
 */
const getExpensesForApproval = async (req, res) => {
  try {
    const { id: userId, role, company_id: companyId } = req.user;
    const { status = 'waiting_approval', dateRange = 'all', amountRange = 'all' } = req.query;

    // Build the base query
    let query = `
      SELECT 
        e.id, e.title, e.description, e.date_of_expense, e.original_amount,
        e.original_currency, e.company_amount, e.company_currency, e.status,
        e.exchange_rate_used, e.submitted_at,
        u.name as requester_name, u.email as requester_email,
        c.name as category_name
      FROM expenses e
      JOIN users u ON e.requester_id = u.id
      LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE e.company_id = $1
    `;

    const params = [companyId];
    let paramIndex = 2;

    // Filter by status
    if (status !== 'all') {
      query += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }
      
      if (startDate) {
        query += ` AND e.date_of_expense >= $${paramIndex}`;
        params.push(startDate.toISOString().split('T')[0]);
        paramIndex++;
      }
    }

    // Filter by amount range
    if (amountRange !== 'all') {
      switch (amountRange) {
        case 'low':
          query += ` AND e.company_amount < 100`;
          break;
        case 'medium':
          query += ` AND e.company_amount BETWEEN 100 AND 500`;
          break;
        case 'high':
          query += ` AND e.company_amount > 500`;
          break;
      }
    }

    // For managers, only show expenses they can approve
    if (role === 'manager') {
      // Add logic to show only expenses from their team members
      query += ` AND e.requester_id IN (
        SELECT mr.user_id FROM manager_relationships mr WHERE mr.manager_id = $${paramIndex}
      )`;
      params.push(userId);
      paramIndex++;
    }

    query += ` ORDER BY e.submitted_at DESC`;

    const { query: dbQuery } = require('../config/db');
    const result = await dbQuery(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error getting expenses for approval:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expenses for approval'
    });
  }
};

/**
 * @desc    Get approval statistics for dashboard
 * @route   GET /api/approval/stats
 * @access  Private (Managers/Admins only)
 */
const getApprovalStats = async (req, res) => {
  try {
    const { id: userId, role, company_id: companyId } = req.user;

    let baseQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'waiting_approval') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COALESCE(SUM(company_amount) FILTER (WHERE status = 'approved'), 0) as total_amount
      FROM expenses 
      WHERE company_id = $1
    `;

    const params = [companyId];

    // For managers, only show stats for their team
    if (role === 'manager') {
      baseQuery += ` AND requester_id IN (
        SELECT mr.user_id FROM manager_relationships mr WHERE mr.manager_id = $2
      )`;
      params.push(userId);
    }

    const { query: dbQuery } = require('../config/db');
    const result = await dbQuery(baseQuery, params);

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        pending: parseInt(stats.pending) || 0,
        approved: parseInt(stats.approved) || 0,
        rejected: parseInt(stats.rejected) || 0,
        totalAmount: parseFloat(stats.total_amount) || 0,
      },
    });
  } catch (error) {
    console.error('Error getting approval stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get approval statistics'
    });
  }
};

/**
 * @desc    Approve expense with workflow
 * @route   POST /api/approval/expenses/:id/approve
 * @access  Private (Managers/Admins only)
 */
const approveExpenseWithWorkflow = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const { id: approverId, role } = req.user;
    const { comments } = req.body;

    const { transaction } = require('../config/db');

    const result = await transaction(async (client) => {
      // Get expense details
      const expenseResult = await client.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const expense = expenseResult.rows[0];

      // Check if user can approve this expense
      if (role === 'manager') {
        const canApprove = await client.query(
          `SELECT 1 FROM manager_relationships mr 
           WHERE mr.manager_id = $1 AND mr.user_id = $2`,
          [approverId, expense.requester_id]
        );

        if (canApprove.rows.length === 0) {
          throw new Error('You do not have permission to approve this expense');
        }
      }

      // Update expense status
      await client.query(
        'UPDATE expenses SET status = $1, updated_at = NOW() WHERE id = $2',
        ['approved', expenseId]
      );

      // Record approval action
      await client.query(
        `INSERT INTO approval_actions (expense_id, approver_id, action, comments, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [expenseId, approverId, 'approved', comments || '']
      );

      return expense;
    });

    res.json({
      success: true,
      message: 'Expense approved successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    res.status(error.message.includes('not found') || error.message.includes('permission') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to approve expense'
    });
  }
};

/**
 * @desc    Reject expense with workflow
 * @route   POST /api/approval/expenses/:id/reject
 * @access  Private (Managers/Admins only)
 */
const rejectExpenseWithWorkflow = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const { id: approverId, role } = req.user;
    const { comments } = req.body;

    if (!comments || !comments.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comments are required when rejecting an expense'
      });
    }

    const { transaction } = require('../config/db');

    const result = await transaction(async (client) => {
      // Get expense details
      const expenseResult = await client.query(
        'SELECT * FROM expenses WHERE id = $1',
        [expenseId]
      );

      if (expenseResult.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const expense = expenseResult.rows[0];

      // Check if user can reject this expense
      if (role === 'manager') {
        const canApprove = await client.query(
          `SELECT 1 FROM manager_relationships mr 
           WHERE mr.manager_id = $1 AND mr.user_id = $2`,
          [approverId, expense.requester_id]
        );

        if (canApprove.rows.length === 0) {
          throw new Error('You do not have permission to reject this expense');
        }
      }

      // Update expense status
      await client.query(
        'UPDATE expenses SET status = $1, updated_at = NOW() WHERE id = $2',
        ['rejected', expenseId]
      );

      // Record rejection action
      await client.query(
        `INSERT INTO approval_actions (expense_id, approver_id, action, comments, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [expenseId, approverId, 'rejected', comments]
      );

      return expense;
    });

    res.json({
      success: true,
      message: 'Expense rejected successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    res.status(error.message.includes('not found') || error.message.includes('permission') ? 404 : 500).json({
      success: false,
      error: error.message || 'Failed to reject expense'
    });
  }
};

// Approve an expense
const approveExpense = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const { id: approverId } = req.user;
    const { comment } = req.body;

    // Check if user can approve this expense
    const canApprove = await approvalService.canApproveExpense(expenseId, approverId);
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to approve this expense'
      });
    }

    const updatedExpense = await approvalService.approveExpense(expenseId, approverId, comment);

    res.json({
      success: true,
      data: updatedExpense,
      message: 'Expense approved successfully'
    });
  } catch (error) {
    console.error('Error approving expense:', error);
    
    if (error.message === 'Expense not found') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    if (error.message === 'Expense is not waiting for approval') {
      return res.status(400).json({
        success: false,
        error: 'Expense is not waiting for approval'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to approve expense'
    });
  }
};

// Reject an expense
const rejectExpense = async (req, res) => {
  try {
    const { id: expenseId } = req.params;
    const { id: approverId } = req.user;
    const { comment } = req.body;

    // Check if user can approve this expense
    const canApprove = await approvalService.canApproveExpense(expenseId, approverId);
    if (!canApprove) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to reject this expense'
      });
    }

    const updatedExpense = await approvalService.rejectExpense(expenseId, approverId, comment);

    res.json({
      success: true,
      data: updatedExpense,
      message: 'Expense rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting expense:', error);
    
    if (error.message === 'Expense not found') {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    if (error.message === 'Expense is not waiting for approval') {
      return res.status(400).json({
        success: false,
        error: 'Expense is not waiting for approval'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to reject expense'
    });
  }
};

// Get approval history for an expense
const getApprovalHistory = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const history = await approvalService.getApprovalHistory(expenseId);

    res.json({
      success: true,
      data: history,
      message: 'Approval history retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting approval history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get approval history'
    });
  }
};

module.exports = {
  getPendingApprovals,
  approveExpense,
  rejectExpense,
  getExpensesForApproval,
  getApprovalStats,
  approveExpenseWithWorkflow,
  rejectExpenseWithWorkflow,
  getApprovalHistory,
};