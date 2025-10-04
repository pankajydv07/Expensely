const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function createTestExpenseWithWorkflow() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Creating test expense with percentage workflow...\n');

    // Get employee user (Bob)
    const employee = await client.query('SELECT id, name FROM users WHERE email = $1', ['bob@acme.com']);
    const employeeId = employee.rows[0].id;
    const employeeName = employee.rows[0].name;

    // Get expense category
    const category = await client.query('SELECT id FROM expense_categories WHERE name = $1 AND company_id = $2', ['Office Supplies', 1]);
    const categoryId = category.rows[0].id;

    console.log(`Employee: ${employeeName} (${employeeId})`);
    console.log(`Category: Office Supplies (${categoryId})\n`);

    // Create a $300 expense (should trigger percentage workflow)
    const expense = await client.query(`
      INSERT INTO expenses (
        company_id, requester_id, title, category_id, 
        original_amount, original_currency, company_amount, company_currency,
        exchange_rate_used, date_of_expense, payment_method, vendor, description, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `, [
      1, employeeId, 'Team Building Event Supplies', categoryId,
      300.00, 'USD', 300.00, 'USD', 1.0,
      new Date(), 'Card', 'OfficeMax', 
      'Supplies for quarterly team building event including decorations, snacks, and games',
      'waiting_approval'
    ]);

    const expenseId = expense.rows[0].id;
    console.log(`Created expense: ${expenseId} - $300 (should trigger 60% approval rule)`);

    // Get the percentage workflow
    const workflow = await client.query(`
      SELECT w.id, w.name FROM approval_workflows w
      JOIN workflow_rules wr ON w.id = wr.workflow_id
      WHERE wr.company_id = $1 AND $2 >= wr.min_amount AND ($2 <= wr.max_amount OR wr.max_amount IS NULL)
      AND wr.is_active = true
      ORDER BY wr.min_amount DESC
      LIMIT 1
    `, [1, 300]);

    if (workflow.rows.length === 0) {
      throw new Error('No matching workflow found for $300 expense');
    }

    const workflowId = workflow.rows[0].id;
    const workflowName = workflow.rows[0].name;

    console.log(`Using workflow: ${workflowName} (${workflowId})`);

    // Create expense workflow instance
    const expenseWorkflow = await client.query(`
      INSERT INTO expense_workflows (expense_id, workflow_id, current_step, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [expenseId, workflowId, 1, 'pending']);

    const expenseWorkflowId = expenseWorkflow.rows[0].id;

    // Get all managers (role_id = 2) for approval
    const managers = await client.query(`
      SELECT id, name, email FROM users 
      WHERE company_id = $1 AND role_id = $2 AND is_active = true
    `, [1, 2]);

    console.log(`Found ${managers.rows.length} managers for approval:`);

    // Get workflow step
    const step = await client.query(`
      SELECT id FROM workflow_steps 
      WHERE workflow_id = $1 AND step_number = $2
    `, [workflowId, 1]);

    const stepId = step.rows[0].id;

    // Create approval records for each manager
    for (const manager of managers.rows) {
      await client.query(`
        INSERT INTO workflow_approvals (expense_workflow_id, step_id, approver_id, status)
        VALUES ($1, $2, $3, $4)
      `, [expenseWorkflowId, stepId, manager.id, 'pending']);

      console.log(`  - ${manager.name} (${manager.email})`);
    }

    // Update expense with workflow reference
    await client.query(`
      UPDATE expenses SET workflow_id = $1, current_workflow_step = $2
      WHERE id = $3
    `, [workflowId, 1, expenseId]);

    await client.query('COMMIT');
    
    console.log('\n✅ Test expense created successfully!');
    console.log(`\nExpense Details:`);
    console.log(`  ID: ${expenseId}`);
    console.log(`  Title: Team Building Event Supplies`);
    console.log(`  Amount: $300.00`);
    console.log(`  Status: waiting_approval`);
    console.log(`  Workflow: ${workflowName} (60% approval required)`);
    console.log(`  Approvers: ${managers.rows.length} managers`);
    console.log(`\nTo test percentage rules:`);
    console.log(`1. Login as admin and check the approval progress`);
    console.log(`2. Have managers approve/reject to see percentage updates`);
    console.log(`3. Check employee dashboard to see approval progress display`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test expense:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestExpenseWithWorkflow();