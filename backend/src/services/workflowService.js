const { query, transaction } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');

class WorkflowService {
  
  /**
   * Get appropriate workflow for an expense based on amount and rules
   */
  async getWorkflowForExpense(companyId, amount, currency, categoryId = null) {
    try {
      console.log('WorkflowService: Finding workflow for amount:', amount, currency, 'company:', companyId);
      
      const result = await query(`
        SELECT w.*, wr.min_amount, wr.max_amount, wr.currency
        FROM approval_workflows w
        JOIN workflow_rules wr ON w.id = wr.workflow_id
        WHERE w.company_id = $1 
          AND w.is_active = true 
          AND wr.is_active = true
          AND wr.currency = $2
          AND (wr.category_id = $3 OR wr.category_id IS NULL)
          AND $4 >= wr.min_amount 
          AND ($4 < wr.max_amount OR wr.max_amount IS NULL)
        ORDER BY wr.min_amount DESC, wr.category_id IS NOT NULL DESC
        LIMIT 1
      `, [companyId, currency, categoryId, amount]);

      if (result.rows.length === 0) {
        console.log('WorkflowService: No workflow found, using default');
        return null; // Use default single-step approval
      }

      const workflow = result.rows[0];
      console.log('WorkflowService: Found workflow:', workflow.name);
      return workflow;
    } catch (error) {
      console.error('Error getting workflow for expense:', error);
      throw error;
    }
  }

  /**
   * Start workflow for an expense
   */
  async startWorkflow(expenseId, workflowId) {
    try {
      return await transaction(async (client) => {
        console.log('WorkflowService: Starting workflow', workflowId, 'for expense', expenseId);

        // Create expense workflow instance
        const workflowInstance = await client.query(`
          INSERT INTO expense_workflows (expense_id, workflow_id, current_step, status)
          VALUES ($1, $2, 1, 'pending')
          RETURNING *
        `, [expenseId, workflowId]);

        // Get first step approvers
        const firstStep = await client.query(`
          SELECT * FROM workflow_steps 
          WHERE workflow_id = $1 AND step_number = 1
          ORDER BY step_number
        `, [workflowId]);

        if (firstStep.rows.length === 0) {
          throw new Error('No workflow steps found');
        }

        const step = firstStep.rows[0];
        const approvers = await this.getApproversForStep(step, expenseId, client);

        // Create approval records for first step
        for (const approverId of approvers) {
          await client.query(`
            INSERT INTO workflow_approvals (expense_workflow_id, step_id, approver_id, status)
            VALUES ($1, $2, $3, 'pending')
          `, [workflowInstance.rows[0].id, step.id, approverId]);
        }

        // Update expense with workflow info
        await client.query(`
          UPDATE expenses 
          SET workflow_id = $1, current_workflow_step = 1, status = 'waiting_approval'
          WHERE id = $2
        `, [workflowId, expenseId]);

        console.log('WorkflowService: Workflow started with', approvers.length, 'approvers for step 1');
        return workflowInstance.rows[0];
      });
    } catch (error) {
      console.error('Error starting workflow:', error);
      throw error;
    }
  }

  /**
   * Get approvers for a specific workflow step
   */
  async getApproversForStep(step, expenseId, client = null) {
    const queryFn = client ? (text, params) => client.query(text, params) : query;
    
    try {
      let approvers = [];

      if (step.approver_type === 'user') {
        // Specific user
        approvers = [step.approver_id];
      } else if (step.approver_type === 'role') {
        // All users with specific role in the company
        const expense = await queryFn('SELECT company_id FROM expenses WHERE id = $1', [expenseId]);
        const companyId = expense.rows[0].company_id;

        const roleUsers = await queryFn(`
          SELECT id FROM users 
          WHERE company_id = $1 AND role_id = $2 AND is_active = true
        `, [companyId, step.approver_role_id]);

        approvers = roleUsers.rows.map(u => u.id);
      } else if (step.approver_type === 'manager' || step.is_manager_required) {
        // Get the manager of the expense requester
        const expenseInfo = await queryFn(`
          SELECT e.requester_id, e.company_id
          FROM expenses e
          WHERE e.id = $1
        `, [expenseId]);

        if (expenseInfo.rows.length > 0) {
          const { requester_id, company_id } = expenseInfo.rows[0];
          
          const managers = await queryFn(`
            SELECT mr.manager_id
            FROM manager_relationships mr
            WHERE mr.user_id = $1
          `, [requester_id]);

          if (managers.rows.length > 0) {
            approvers = managers.rows.map(m => m.manager_id);
          } else {
            // Fallback to all managers in company if no direct manager
            const allManagers = await queryFn(`
              SELECT id FROM users 
              WHERE company_id = $1 AND role_id = 2 AND is_active = true
            `, [company_id]);
            
            approvers = allManagers.rows.map(m => m.id);
          }
        }
      }

      return approvers;
    } catch (error) {
      console.error('Error getting approvers for step:', error);
      throw error;
    }
  }

  /**
   * Process approval for a workflow step
   */
  async processApproval(expenseId, approverId, action, comment = null) {
    try {
      return await transaction(async (client) => {
        console.log('WorkflowService: Processing', action, 'for expense', expenseId, 'by user', approverId);

        // Get current workflow instance
        const workflowInstance = await client.query(`
          SELECT * FROM expense_workflows WHERE expense_id = $1 AND status = 'pending'
        `, [expenseId]);

        if (workflowInstance.rows.length === 0) {
          throw new Error('No active workflow found for expense');
        }

        const instance = workflowInstance.rows[0];

        // Update the specific approval record
        await client.query(`
          UPDATE workflow_approvals 
          SET status = $1, comment = $2, approved_at = NOW()
          WHERE expense_workflow_id = $3 AND approver_id = $4 AND status = 'pending'
        `, [action, comment, instance.id, approverId]);

        // Log the action
        await client.query(`
          INSERT INTO approval_actions (expense_id, approver_id, action, comment, step_number)
          VALUES ($1, $2, $3, $4, $5)
        `, [expenseId, approverId, action, comment, instance.current_step]);

        if (action === 'reject') {
          // If rejected, mark entire workflow as rejected
          await client.query(`
            UPDATE expense_workflows SET status = 'rejected', completed_at = NOW() WHERE id = $1
          `, [instance.id]);

          await client.query(`
            UPDATE expenses SET status = 'rejected' WHERE id = $1
          `, [expenseId]);

          console.log('WorkflowService: Expense rejected, workflow completed');
          return { status: 'rejected', message: 'Expense rejected' };
        }

        // Check if current step is complete
        const stepComplete = await this.isStepComplete(instance.id, instance.current_step, client);
        
        if (stepComplete) {
          console.log('WorkflowService: Step', instance.current_step, 'completed');
          return await this.moveToNextStep(instance, client);
        }

        console.log('WorkflowService: Approval recorded, waiting for other approvers in current step');
        return { status: 'pending', message: 'Approval recorded, waiting for other approvers' };
      });
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  /**
   * Check if current workflow step is complete based on advanced rules
   */
  async isStepComplete(workflowInstanceId, currentStep, client) {
    try {
      // Get workflow conditions with approver details
      const workflow = await client.query(`
        SELECT w.*, wc.*, u.name as specific_approver_name
        FROM approval_workflows w
        JOIN expense_workflows ew ON w.id = ew.workflow_id
        LEFT JOIN workflow_conditions wc ON w.id = wc.workflow_id
        LEFT JOIN users u ON wc.specific_approver_id = u.id
        WHERE ew.id = $1
      `, [workflowInstanceId]);

      // Get current step approvals with approver names
      const approvals = await client.query(`
        SELECT wa.*, ws.step_number, u.name as approver_name
        FROM workflow_approvals wa
        JOIN workflow_steps ws ON wa.step_id = ws.id
        JOIN users u ON wa.approver_id = u.id
        WHERE wa.expense_workflow_id = $1 AND ws.step_number = $2
      `, [workflowInstanceId, currentStep]);

      const totalApprovers = approvals.rows.length;
      const approvedCount = approvals.rows.filter(a => a.status === 'approved').length;
      const rejectedCount = approvals.rows.filter(a => a.status === 'rejected').length;
      const currentPercentage = totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 0;

      console.log(`WorkflowService: Step ${currentStep} progress: ${approvedCount} approved, ${rejectedCount} rejected out of ${totalApprovers} (${currentPercentage.toFixed(1)}%)`);

      // Group conditions by type for processing
      const conditions = workflow.rows.filter(row => row.condition_type);
      
      // If any approver rejected, check if flexible rules allow continuation
      if (rejectedCount > 0) {
        const hasFlexibleRules = conditions.some(c => 
          c.condition_type === 'percentage' || c.condition_type === 'hybrid'
        );
        if (!hasFlexibleRules) {
          console.log('WorkflowService: ❌ Step rejected - no flexible rules allow continuation');
          return false;
        }
      }

      // Process approval conditions
      for (const condition of conditions) {
        console.log(`WorkflowService: Evaluating ${condition.condition_type} rule`);
        
        switch (condition.condition_type) {
          case 'percentage':
            if (currentPercentage >= condition.percentage_required) {
              console.log(`WorkflowService: ✅ Percentage rule satisfied: ${currentPercentage.toFixed(1)}% >= ${condition.percentage_required}%`);
              return true;
            }
            console.log(`WorkflowService: ⏳ Percentage rule pending: ${currentPercentage.toFixed(1)}% < ${condition.percentage_required}%`);
            break;
            
          case 'specific_approver':
            const specificApproval = approvals.rows.find(a => 
              a.approver_id === condition.specific_approver_id && a.status === 'approved'
            );
            if (specificApproval && condition.auto_approve_on_specific) {
              console.log(`WorkflowService: ✅ Specific approver auto-approval: ${condition.specific_approver_name} approved`);
              return true;
            }
            if (specificApproval) {
              console.log(`WorkflowService: ✅ Specific approver approved: ${condition.specific_approver_name}`);
            }
            break;
            
          case 'hybrid':
            const specificHybridApproval = approvals.rows.find(a => 
              a.approver_id === condition.specific_approver_id && a.status === 'approved'
            );
            
            const percentageMet = currentPercentage >= condition.percentage_required;
            const specificApproverApproved = specificHybridApproval && condition.auto_approve_on_specific;
            
            if (percentageMet || specificApproverApproved) {
              const reason = percentageMet && specificApproverApproved ? 
                `both percentage (${currentPercentage.toFixed(1)}%) AND specific approver (${condition.specific_approver_name})` :
                percentageMet ? `percentage (${currentPercentage.toFixed(1)}%)` : 
                `specific approver (${condition.specific_approver_name})`;
              console.log(`WorkflowService: ✅ Hybrid rule satisfied via ${reason}`);
              return true;
            }
            console.log(`WorkflowService: ⏳ Hybrid rule pending: ${currentPercentage.toFixed(1)}% < ${condition.percentage_required}% AND ${condition.specific_approver_name} not approved`);
            break;
        }
      }

      // If no conditions specified, default to sequential (all must approve)
      if (conditions.length === 0) {
        const allApproved = approvedCount === totalApprovers && rejectedCount === 0;
        console.log(`WorkflowService: ${allApproved ? '✅' : '⏳'} Default sequential rule: ${approvedCount}/${totalApprovers} approved`);
        return allApproved;
      }

      console.log('WorkflowService: ⏳ No completion conditions met yet');
      return false;

    } catch (error) {
      console.error('Error checking step completion:', error);
      throw error;
    }
  }

  /**
   * Move workflow to next step or complete it
   */
  async moveToNextStep(workflowInstance, client) {
    try {
      const nextStep = workflowInstance.current_step + 1;

      // Check if there are more steps
      const nextStepInfo = await client.query(`
        SELECT * FROM workflow_steps 
        WHERE workflow_id = $1 AND step_number = $2
      `, [workflowInstance.workflow_id, nextStep]);

      if (nextStepInfo.rows.length === 0) {
        // No more steps, workflow complete
        await client.query(`
          UPDATE expense_workflows 
          SET status = 'completed', completed_at = NOW() 
          WHERE id = $1
        `, [workflowInstance.id]);

        await client.query(`
          UPDATE expenses SET status = 'approved' WHERE id = $1
        `, [workflowInstance.expense_id]);

        console.log('WorkflowService: Workflow completed, expense approved');
        return { status: 'approved', message: 'Expense approved' };
      }

      // Move to next step
      await client.query(`
        UPDATE expense_workflows 
        SET current_step = $1 
        WHERE id = $2
      `, [nextStep, workflowInstance.id]);

      await client.query(`
        UPDATE expenses 
        SET current_workflow_step = $1 
        WHERE id = $2
      `, [nextStep, workflowInstance.expense_id]);

      // Get approvers for next step
      const step = nextStepInfo.rows[0];
      const approvers = await this.getApproversForStep(step, workflowInstance.expense_id, client);

      // Create approval records for next step
      for (const approverId of approvers) {
        await client.query(`
          INSERT INTO workflow_approvals (expense_workflow_id, step_id, approver_id, status)
          VALUES ($1, $2, $3, 'pending')
        `, [workflowInstance.id, step.id, approverId]);
      }

      console.log('WorkflowService: Moved to step', nextStep, 'with', approvers.length, 'approvers');
      return { 
        status: 'moved_to_next_step', 
        message: `Moved to ${step.step_name}`,
        current_step: nextStep 
      };

    } catch (error) {
      console.error('Error moving to next step:', error);
      throw error;
    }
  }

  /**
   * Get pending approvals for a user (with workflow context)
   */
  async getPendingApprovalsForUser(userId, companyId) {
    try {
      console.log('WorkflowService: Getting pending approvals for user:', userId);

      // Check if user is admin (can see all)
      const userRole = await query(`
        SELECT role_id FROM users WHERE id = $1 AND company_id = $2
      `, [userId, companyId]);

      let whereCondition = '';
      let additionalJoins = 'LEFT JOIN workflow_approvals wa ON ew.id = wa.expense_workflow_id AND ws.id = wa.step_id';
      let params = [companyId];

      if (userRole.rows[0]?.role_id === 1) {
        // Admin can see all pending approvals
        whereCondition = 'e.company_id = $1 AND e.status = \'waiting_approval\'';
      } else {
        // Manager/other roles see only their assigned approvals
        whereCondition = 'e.company_id = $1 AND e.status = \'waiting_approval\' AND wa.approver_id = $2 AND wa.status = \'pending\'';
        params.push(userId);
      }

      const result = await query(`
        SELECT DISTINCT
          e.id,
          e.title,
          e.description,
          e.original_amount,
          e.original_currency,
          e.company_amount as amount,
          e.company_currency as currency,
          e.date_of_expense as expense_date,
          e.status,
          e.submitted_at,
          e.current_workflow_step,
          u.name as user_name,
          u.email as user_email,
          ec.name as category_name,
          w.name as workflow_name,
          ws.step_name,
          ws.step_number,
          wa.status as approval_status
        FROM expenses e
        JOIN users u ON e.requester_id = u.id
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN expense_workflows ew ON e.id = ew.expense_id
        LEFT JOIN approval_workflows w ON ew.workflow_id = w.id
        LEFT JOIN workflow_steps ws ON w.id = ws.workflow_id AND ws.step_number = e.current_workflow_step
        ${additionalJoins}
        WHERE ${whereCondition}
        ORDER BY e.submitted_at ASC
      `, params);

      console.log('WorkflowService: Found', result.rows.length, 'pending approvals');
      return result.rows;
    } catch (error) {
      console.error('Error getting pending approvals for user:', error);
      throw error;
    }
  }

  /**
   * Get all workflows for a company (for admin configuration)
   */
  async getWorkflows(companyId) {
    try {
      const workflows = await query(`
        SELECT w.*, 
               (SELECT COUNT(*) FROM workflow_steps WHERE workflow_id = w.id) as step_count,
               (SELECT COUNT(*) FROM workflow_rules WHERE workflow_id = w.id) as rule_count
        FROM approval_workflows w
        WHERE w.company_id = $1
        ORDER BY w.created_at DESC
      `, [companyId]);

      return workflows.rows;
    } catch (error) {
      console.error('Error getting workflows:', error);
      throw error;
    }
  }

  /**
   * Create new workflow
   */
  async createWorkflow(companyId, workflowData) {
    try {
      return await transaction(async (client) => {
        const { name, description, steps, conditions, rules } = workflowData;

        // Create workflow
        const workflow = await client.query(`
          INSERT INTO approval_workflows (company_id, name, description)
          VALUES ($1, $2, $3)
          RETURNING *
        `, [companyId, name, description]);

        const workflowId = workflow.rows[0].id;

        // Create steps
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await client.query(`
            INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_id, approver_role_id, is_manager_required)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [workflowId, i + 1, step.step_name, step.approver_type, step.approver_id, step.approver_role_id, step.is_manager_required]);
        }

        // Create conditions
        if (conditions) {
          for (const condition of conditions) {
            await client.query(`
              INSERT INTO workflow_conditions (workflow_id, condition_type, percentage_required, specific_approver_id, auto_approve_on_specific)
              VALUES ($1, $2, $3, $4, $5)
            `, [workflowId, condition.condition_type, condition.percentage_required, condition.specific_approver_id, condition.auto_approve_on_specific]);
          }
        }

        // Create rules
        if (rules) {
          for (const rule of rules) {
            await client.query(`
              INSERT INTO workflow_rules (company_id, workflow_id, min_amount, max_amount, currency, category_id)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [companyId, workflowId, rule.min_amount, rule.max_amount, rule.currency, rule.category_id]);
          }
        }

        return workflow.rows[0];
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get approval progress for an expense
   */
  async getApprovalProgress(expenseId) {
    try {
      console.log('WorkflowService: Getting approval progress for expense', expenseId);

      // Get expense workflow details
      const workflowInfo = await query(`
        SELECT 
          ew.id as workflow_instance_id,
          ew.current_step,
          ew.status as workflow_status,
          w.name as workflow_name,
          e.status as expense_status,
          e.title as expense_title,
          e.company_amount,
          e.company_currency
        FROM expense_workflows ew
        JOIN approval_workflows w ON ew.workflow_id = w.id
        JOIN expenses e ON ew.expense_id = e.id
        WHERE ew.expense_id = $1
        ORDER BY ew.created_at DESC
        LIMIT 1
      `, [expenseId]);

      if (workflowInfo.rows.length === 0) {
        return {
          expenseId,
          status: 'no_workflow',
          message: 'No workflow found for this expense'
        };
      }

      const workflow = workflowInfo.rows[0];

      // Get workflow conditions for this workflow
      const conditions = await query(`
        SELECT 
          condition_type,
          percentage_required,
          specific_approver_id,
          auto_approve_on_specific,
          u.name as specific_approver_name
        FROM workflow_conditions wc
        LEFT JOIN users u ON wc.specific_approver_id = u.id
        WHERE wc.workflow_id = (
          SELECT workflow_id FROM expense_workflows WHERE expense_id = $1
        )
      `, [expenseId]);

      // Get current step approvals
      const approvals = await query(`
        SELECT 
          wa.approver_id,
          wa.status,
          wa.approved_at,
          wa.comment,
          u.name as approver_name,
          u.email as approver_email,
          ws.step_number,
          ws.step_name
        FROM workflow_approvals wa
        JOIN workflow_steps ws ON wa.step_id = ws.id
        JOIN users u ON wa.approver_id = u.id
        WHERE wa.expense_workflow_id = $1 AND ws.step_number = $2
        ORDER BY wa.created_at
      `, [workflow.workflow_instance_id, workflow.current_step]);

      // Calculate progress statistics
      const totalApprovers = approvals.rows.length;
      const approvedCount = approvals.rows.filter(a => a.status === 'approved').length;
      const rejectedCount = approvals.rows.filter(a => a.status === 'rejected').length;
      const pendingCount = approvals.rows.filter(a => a.status === 'pending').length;
      const currentPercentage = totalApprovers > 0 ? (approvedCount / totalApprovers) * 100 : 0;

      // Determine rule types and requirements
      const ruleTypes = conditions.rows.map(c => c.condition_type);
      const hasPercentageRule = ruleTypes.includes('percentage');
      const hasSpecificApproverRule = ruleTypes.includes('specific_approver');
      const hasHybridRule = ruleTypes.includes('hybrid');

      let progressInfo = {
        expenseId,
        workflowName: workflow.workflow_name,
        currentStep: workflow.current_step,
        workflowStatus: workflow.workflow_status,
        expenseStatus: workflow.expense_status,
        expenseTitle: workflow.expense_title,
        amount: workflow.company_amount,
        currency: workflow.company_currency,
        
        // Progress statistics
        totalApprovers,
        approvedCount,
        rejectedCount,
        pendingCount,
        currentPercentage: Math.round(currentPercentage * 10) / 10, // Round to 1 decimal place
        
        // Rule information
        ruleTypes,
        hasPercentageRule,
        hasSpecificApproverRule,
        hasHybridRule,
        
        // Approver details
        approvers: approvals.rows.map(a => ({
          id: a.approver_id,
          name: a.approver_name,
          email: a.approver_email,
          status: a.status,
          approvedAt: a.approved_at,
          comment: a.comment
        })),
        
        // Conditions details
        conditions: conditions.rows.map(c => ({
          type: c.condition_type,
          percentageRequired: c.percentage_required,
          specificApproverId: c.specific_approver_id,
          specificApproverName: c.specific_approver_name,
          autoApproveOnSpecific: c.auto_approve_on_specific
        }))
      };

      // Add rule-specific progress information
      if (hasPercentageRule) {
        const percentageCondition = conditions.rows.find(c => c.condition_type === 'percentage');
        progressInfo.percentageRule = {
          required: percentageCondition.percentage_required,
          current: progressInfo.currentPercentage,
          satisfied: progressInfo.currentPercentage >= percentageCondition.percentage_required,
          remaining: Math.max(0, percentageCondition.percentage_required - progressInfo.currentPercentage)
        };
      }

      if (hasSpecificApproverRule) {
        const specificCondition = conditions.rows.find(c => c.condition_type === 'specific_approver');
        const specificApproval = approvals.rows.find(a => a.approver_id === specificCondition.specific_approver_id);
        progressInfo.specificApproverRule = {
          approverId: specificCondition.specific_approver_id,
          approverName: specificCondition.specific_approver_name,
          autoApprove: specificCondition.auto_approve_on_specific,
          hasApproved: specificApproval ? specificApproval.status === 'approved' : false,
          status: specificApproval ? specificApproval.status : 'pending'
        };
      }

      if (hasHybridRule) {
        const hybridCondition = conditions.rows.find(c => c.condition_type === 'hybrid');
        const specificApproval = approvals.rows.find(a => a.approver_id === hybridCondition.specific_approver_id);
        const percentageSatisfied = progressInfo.currentPercentage >= hybridCondition.percentage_required;
        const specificSatisfied = specificApproval && specificApproval.status === 'approved';
        
        progressInfo.hybridRule = {
          percentageRequired: hybridCondition.percentage_required,
          currentPercentage: progressInfo.currentPercentage,
          percentageSatisfied,
          specificApproverId: hybridCondition.specific_approver_id,
          specificApproverName: hybridCondition.specific_approver_name,
          specificSatisfied,
          autoApproveOnSpecific: hybridCondition.auto_approve_on_specific,
          overallSatisfied: percentageSatisfied || (specificSatisfied && hybridCondition.auto_approve_on_specific),
          satisfiedBy: percentageSatisfied && specificSatisfied ? 'both' : 
                      percentageSatisfied ? 'percentage' : 
                      specificSatisfied ? 'specific' : 'none'
        };
      }

      // Generate user-friendly status message
      let statusMessage = '';
      if (workflow.workflow_status === 'completed') {
        statusMessage = 'Approval process completed';
      } else if (workflow.workflow_status === 'rejected') {
        statusMessage = 'Expense has been rejected';
      } else {
        if (hasHybridRule && progressInfo.hybridRule.overallSatisfied) {
          statusMessage = `Ready for approval via ${progressInfo.hybridRule.satisfiedBy} rule`;
        } else if (hasPercentageRule && progressInfo.percentageRule.satisfied) {
          statusMessage = `${progressInfo.percentageRule.current}% approved (${progressInfo.percentageRule.required}% required)`;
        } else if (hasSpecificApproverRule && progressInfo.specificApproverRule.hasApproved) {
          statusMessage = `Approved by ${progressInfo.specificApproverRule.approverName}`;
        } else {
          statusMessage = `${approvedCount}/${totalApprovers} approvers have approved (${progressInfo.currentPercentage}%)`;
        }
      }

      progressInfo.statusMessage = statusMessage;

      console.log('WorkflowService: Approval progress calculated:', {
        expenseId,
        currentPercentage: progressInfo.currentPercentage,
        approvedCount,
        totalApprovers,
        statusMessage
      });

      return progressInfo;
      
    } catch (error) {
      console.error('Error getting approval progress:', error);
      throw error;
    }
  }
}

module.exports = new WorkflowService();