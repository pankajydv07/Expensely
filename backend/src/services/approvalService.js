const { query, transaction } = require('../config/db');

class ApprovalService {
  // Get pending approvals for a manager or admin
  async getPendingApprovals(userId, companyId) {
    try {
      console.log('ApprovalService: Getting pending approvals for user:', userId, 'company:', companyId);
      
      // First check if user is admin
      const userRole = await query(`
        SELECT role_id FROM users WHERE id = $1 AND company_id = $2
      `, [userId, companyId]);

      console.log('ApprovalService: User role:', userRole.rows[0]?.role_id);

      let whereCondition;
      if (userRole.rows[0]?.role_id === 1) {
        // Admin can see all pending approvals in the company
        whereCondition = `e.company_id = $1 AND e.status = 'waiting_approval'`;
        console.log('ApprovalService: Admin access - showing all company approvals');
      } else {
        // Manager can only see approvals for their direct reports
        whereCondition = `e.company_id = $1 AND e.status = 'waiting_approval' AND mr.manager_id = $2`;
        console.log('ApprovalService: Manager access - showing team approvals only');
      }

      // Get expenses that are waiting for approval
      const result = await query(`
        SELECT 
          e.id,
          e.title,
          e.original_amount,
          e.original_currency,
          e.company_amount,
          e.company_currency,
          e.date_of_expense,
          e.description,
          e.status,
          e.submitted_at,
          u.name as user_name,
          u.email as user_email,
          ec.name as category_name,
          -- Use company amount and currency for consistent display
          e.company_amount as amount,
          e.company_currency as currency,
          e.date_of_expense as expense_date
        FROM expenses e
        JOIN users u ON e.requester_id = u.id
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        ${userRole.rows[0]?.role_id === 1 ? '' : 'LEFT JOIN manager_relationships mr ON u.id = mr.user_id'}
        WHERE ${whereCondition}
        ORDER BY e.submitted_at ASC
      `, userRole.rows[0]?.role_id === 1 ? [companyId] : [companyId, userId]);

      console.log('ApprovalService: Found', result.rows.length, 'pending approvals');
      return result.rows;
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  // Approve an expense
  async approveExpense(expenseId, approverId, comment = null) {
    try {
      return await transaction(async (client) => {
        // Check if expense exists and is pending approval
        const expenseResult = await client.query(
          'SELECT * FROM expenses WHERE id = $1',
          [expenseId]
        );

        if (expenseResult.rows.length === 0) {
          throw new Error('Expense not found');
        }

        const expense = expenseResult.rows[0];

        if (expense.status !== 'waiting_approval') {
          throw new Error('Expense is not waiting for approval');
        }

        // Update expense status to approved
        await client.query(
          `UPDATE expenses 
           SET status = 'approved', updated_at = now() 
           WHERE id = $1`,
          [expenseId]
        );

        // Log the approval action
        await client.query(
          `INSERT INTO approval_actions (expense_id, approver_id, action, comment, created_at)
           VALUES ($1, $2, 'approve', $3, now())`,
          [expenseId, approverId, comment]
        );

        // Get updated expense
        const updatedResult = await client.query(
          `SELECT e.*, u.name as requester_name, u.email as requester_email,
                  ec.name as category_name
           FROM expenses e
           LEFT JOIN users u ON e.requester_id = u.id
           LEFT JOIN expense_categories ec ON e.category_id = ec.id
           WHERE e.id = $1`,
          [expenseId]
        );

        return updatedResult.rows[0];
      });
    } catch (error) {
      console.error('Error approving expense:', error);
      throw error;
    }
  }

  // Reject an expense
  async rejectExpense(expenseId, approverId, comment = null) {
    try {
      return await transaction(async (client) => {
        // Check if expense exists and is pending approval
        const expenseResult = await client.query(
          'SELECT * FROM expenses WHERE id = $1',
          [expenseId]
        );

        if (expenseResult.rows.length === 0) {
          throw new Error('Expense not found');
        }

        const expense = expenseResult.rows[0];

        if (expense.status !== 'waiting_approval') {
          throw new Error('Expense is not waiting for approval');
        }

        // Update expense status to rejected
        await client.query(
          `UPDATE expenses 
           SET status = 'rejected', updated_at = now() 
           WHERE id = $1`,
          [expenseId]
        );

        // Log the rejection action
        await client.query(
          `INSERT INTO approval_actions (expense_id, approver_id, action, comment, created_at)
           VALUES ($1, $2, 'reject', $3, now())`,
          [expenseId, approverId, comment]
        );

        // Get updated expense
        const updatedResult = await client.query(
          `SELECT e.*, u.name as requester_name, u.email as requester_email,
                  ec.name as category_name
           FROM expenses e
           LEFT JOIN users u ON e.requester_id = u.id
           LEFT JOIN expense_categories ec ON e.category_id = ec.id
           WHERE e.id = $1`,
          [expenseId]
        );

        return updatedResult.rows[0];
      });
    } catch (error) {
      console.error('Error rejecting expense:', error);
      throw error;
    }
  }

  // Get approval history for an expense
  async getApprovalHistory(expenseId) {
    try {
      const result = await query(`
        SELECT 
          aa.id,
          aa.action,
          aa.comment,
          aa.created_at,
          u.name as approver_name,
          u.email as approver_email
        FROM approval_actions aa
        LEFT JOIN users u ON aa.approver_id = u.id
        WHERE aa.expense_id = $1
        ORDER BY aa.created_at ASC
      `, [expenseId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting approval history:', error);
      throw error;
    }
  }

  // Check if user can approve an expense
  async canApproveExpense(expenseId, userId) {
    try {
      const result = await query(`
        SELECT e.*, mr.manager_id, u.role_id, u.company_id
        FROM expenses e
        JOIN users requester ON e.requester_id = requester.id
        LEFT JOIN manager_relationships mr ON requester.id = mr.user_id
        JOIN users u ON u.id = $2
        WHERE e.id = $1
      `, [expenseId, userId]);

      if (result.rows.length === 0) {
        return false;
      }

      const expense = result.rows[0];
      
      // Admin can approve any expense in their company
      if (expense.role_id === 1) { // Admin role
        return expense.company_id === expense.company_id;
      }

      // Manager can approve if they are the direct manager
      if (expense.role_id === 2) { // Manager role
        return expense.manager_id === userId;
      }

      return false;
    } catch (error) {
      console.error('Error checking approval permission:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalService();