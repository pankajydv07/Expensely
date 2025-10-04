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
  getApprovalHistory,
};