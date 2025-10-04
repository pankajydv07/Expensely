const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/rbacMiddleware');
const workflowController = require('../controllers/workflowController');

const router = express.Router();

// All routes require authentication and admin access
router.use(protect, isAdmin);

// Workflow CRUD routes
router.get('/', workflowController.getWorkflows);
router.post('/', workflowController.createWorkflow);
router.get('/stats', workflowController.getWorkflowStats);
router.get('/:id', workflowController.getWorkflowDetails);  
router.put('/:id', workflowController.updateWorkflow);
router.delete('/:id', workflowController.deleteWorkflow);

module.exports = router;