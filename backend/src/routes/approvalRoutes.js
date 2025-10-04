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

// Dashboard routes
router.get('/expenses', 
  protect, 
  isManagerOrAdmin, 
  approvalController.getExpensesForApproval
);

router.get('/stats', 
  protect, 
  isManagerOrAdmin, 
  approvalController.getApprovalStats
);

// Workflow approval routes
router.post('/expenses/:id/approve', 
  protect, 
  isManagerOrAdmin, 
  approvalController.approveExpenseWithWorkflow
);

router.post('/expenses/:id/reject', 
  protect, 
  isManagerOrAdmin, 
  approvalController.rejectExpenseWithWorkflow
);

// Legacy approval routes (for backwards compatibility)
router.post('/:id/approve', 
  protect, 
  isManagerOrAdmin, 
  approvalController.approveExpense
);

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

