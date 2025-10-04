const workflowService = require('../services/workflowService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError } = require('../middlewares/errorHandler');

/**
 * @desc    Get all workflows for company
 * @route   GET /api/workflows
 * @access  Private (Admin only)
 */
const getWorkflows = asyncHandler(async (req, res) => {
  const workflows = await workflowService.getWorkflows(req.user.company_id);
  
  res.status(200).json({
    success: true,
    data: workflows
  });
});

/**
 * @desc    Create new workflow
 * @route   POST /api/workflows
 * @access  Private (Admin only)
 */
const createWorkflow = asyncHandler(async (req, res) => {
  const workflow = await workflowService.createWorkflow(req.user.company_id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Workflow created successfully',
    data: workflow
  });
});

/**
 * @desc    Get workflow details with steps and conditions
 * @route   GET /api/workflows/:id
 * @access  Private (Admin only)
 */
const getWorkflowDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const workflow = await workflowService.getWorkflowDetails(id);
  
  if (!workflow) {
    throw new AppError('Workflow not found', 404);
  }
  
  res.status(200).json({
    success: true,
    data: workflow
  });
});

/**
 * @desc    Update workflow
 * @route   PUT /api/workflows/:id
 * @access  Private (Admin only)
 */
const updateWorkflow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const workflow = await workflowService.updateWorkflow(id, req.body);
  
  res.status(200).json({
    success: true,
    message: 'Workflow updated successfully',
    data: workflow
  });
});

/**
 * @desc    Delete workflow
 * @route   DELETE /api/workflows/:id
 * @access  Private (Admin only)
 */
const deleteWorkflow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await workflowService.deleteWorkflow(id);
  
  res.status(200).json({
    success: true,
    message: 'Workflow deleted successfully'
  });
});

/**
 * @desc    Get workflow statistics
 * @route   GET /api/workflows/stats
 * @access  Private (Admin only)
 */
const getWorkflowStats = asyncHandler(async (req, res) => {
  const stats = await workflowService.getWorkflowStats(req.user.company_id);
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  getWorkflows,
  createWorkflow,
  getWorkflowDetails,
  updateWorkflow,
  deleteWorkflow,
  getWorkflowStats
};