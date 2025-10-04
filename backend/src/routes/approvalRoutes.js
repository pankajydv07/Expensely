const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { isManagerOrAdmin } = require('../middlewares/rbacMiddleware');
const approvalController = require('../controllers/approvalController');

const router = express.Router();

// Get pending approvals for the current user (managers only)
router.get('/pending', 
  protect, 
  isManagerOrAdmin, 
  approvalController.getPendingApprovals
);

// Approve an expense
router.post('/:id/approve', 
  protect, 
  isManagerOrAdmin, 
  approvalController.approveExpense
);

// Reject an expense
router.post('/:id/reject', 
  protect, 
  isManagerOrAdmin, 
  approvalController.rejectExpense
);

// Get approval history for an expense
router.get('/:expenseId/history', 
  protect, 
  approvalController.getApprovalHistory
);

module.exports = router;

