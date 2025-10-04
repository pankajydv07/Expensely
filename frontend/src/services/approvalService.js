import api from './api';

// Get pending approvals (for managers)
export const getPendingApprovals = async () => {
  try {
    const response = await api.get('/approvals/pending');
    return response.data;
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    throw error;
  }
};

// Approve an expense
export const approveExpense = async (expenseId, comment = '') => {
  try {
    const response = await api.post(`/approvals/${expenseId}/approve`, {
      comment
    });
    return response.data;
  } catch (error) {
    console.error('Error approving expense:', error);
    throw error;
  }
};

// Reject an expense
export const rejectExpense = async (expenseId, comment = '') => {
  try {
    const response = await api.post(`/approvals/${expenseId}/reject`, {
      comment
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting expense:', error);
    throw error;
  }
};

// Get approval history for an expense
export const getApprovalHistory = async (expenseId) => {
  try {
    const response = await api.get(`/approvals/${expenseId}/history`);
    return response.data;
  } catch (error) {
    console.error('Error getting approval history:', error);
    throw error;
  }
};

const approvalService = {
  getPendingApprovals,
  approveExpense,
  rejectExpense,
  getApprovalHistory,
};

export default approvalService;