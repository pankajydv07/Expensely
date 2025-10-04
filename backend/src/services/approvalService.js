const { query, transaction } = require('../config/db');

class ApprovalService {
  // Get pending approvals for a manager or admin (with workflow support)
  async getPendingApprovals(userId, companyId) {
    try {
      console.log('ApprovalService: Getting pending approvals for user:', userId, 'company:', companyId);
      
      // Use workflow service for better approval handling
      const workflowService = require('./workflowService');
      return await workflowService.getPendingApprovalsForUser(userId, companyId);
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      throw error;
    }
  }

  // Approve an expense (with workflow support)
  async approveExpense(expenseId, approverId, comment = null) {
    try {
      console.log('ApprovalService: Approving expense', expenseId, 'by user', approverId);
      
      // Check if expense has a workflow
      const workflowCheck = await query(`
        SELECT workflow_id FROM expenses WHERE id = $1
      `, [expenseId]);

      if (workflowCheck.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const workflowId = workflowCheck.rows[0].workflow_id;

      if (workflowId) {
        // Use workflow service for approval
        const workflowService = require('./workflowService');
        return await workflowService.processApproval(expenseId, approverId, 'approved', comment);
      } else {
        // Fallback to simple approval
        return await this.simpleApproval(expenseId, approverId, 'approve', comment);
      }
    } catch (error) {
      console.error('Error approving expense:', error);
      throw error;
    }
  }

  // Simple approval (legacy/fallback)
  async simpleApproval(expenseId, approverId, action, comment = null) {
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

        // Update expense status
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await client.query(
          `UPDATE expenses 
           SET status = $1, updated_at = now() 
           WHERE id = $2`,
          [newStatus, expenseId]
        );

        // Log the approval action
        await client.query(
          `INSERT INTO approval_actions (expense_id, approver_id, action, comment, created_at)
           VALUES ($1, $2, $3, $4, now())`,
          [expenseId, approverId, action, comment]
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

  // Reject an expense (with workflow support)
  async rejectExpense(expenseId, approverId, comment = null) {
    try {
      console.log('ApprovalService: Rejecting expense', expenseId, 'by user', approverId);
      
      // Check if expense has a workflow
      const workflowCheck = await query(`
        SELECT workflow_id FROM expenses WHERE id = $1
      `, [expenseId]);

      if (workflowCheck.rows.length === 0) {
        throw new Error('Expense not found');
      }

      const workflowId = workflowCheck.rows[0].workflow_id;

      if (workflowId) {
        // Use workflow service for rejection
        const workflowService = require('./workflowService');
        return await workflowService.processApproval(expenseId, approverId, 'reject', comment);
      } else {
        // Fallback to simple rejection
        return await this.simpleApproval(expenseId, approverId, 'reject', comment);
      }
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

  // Get approval progress for an expense
  async getApprovalProgress(expenseId) {
    try {
      console.log('ApprovalService: Getting approval progress for expense:', expenseId);
      
      const workflowService = require('./workflowService');
      return await workflowService.getApprovalProgress(expenseId);
    } catch (error) {
      console.error('Error getting approval progress:', error);
      throw error;
    }
  }
}

module.exports = new ApprovalService();