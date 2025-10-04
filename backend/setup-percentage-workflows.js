const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function setupApprovalWorkflowsWithPercentageRules() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Setting up approval workflows with percentage rules...\n');

    // Get company ID and user IDs
    const company = await client.query('SELECT id FROM companies WHERE name = $1', ['Acme Corporation']);
    const companyId = company.rows[0].id;
    
    const admin = await client.query('SELECT id, name FROM users WHERE email = $1', ['admin@acme.com']);
    const adminId = admin.rows[0].id;
    const adminName = admin.rows[0].name;

    const manager = await client.query('SELECT id, name FROM users WHERE email = $1', ['john.manager@acme.com']);
    const managerId = manager.rows[0].id;
    const managerName = manager.rows[0].name;

    console.log(`Company ID: ${companyId}`);
    console.log(`Admin: ${adminName} (${adminId})`);
    console.log(`Manager: ${managerName} (${managerId})\n`);

    // 1. Create a workflow with percentage rule (60% approval required)
    console.log('1. Creating workflow with 60% percentage rule...');
    const percentageWorkflow = await client.query(`
      INSERT INTO approval_workflows (company_id, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      companyId,
      'Team Consensus Workflow',
      'Requires 60% of team members to approve',
      true
    ]);
    const percentageWorkflowId = percentageWorkflow.rows[0].id;

    // Create workflow step
    const percentageStep = await client.query(`
      INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [percentageWorkflowId, 1, 'Team Review', 'role', 2]); // Role 2 = Manager

    // Create workflow condition for percentage rule
    await client.query(`
      INSERT INTO workflow_conditions (workflow_id, condition_type, percentage_required)
      VALUES ($1, $2, $3)
    `, [percentageWorkflowId, 'percentage', 60]);

    console.log('✓ Created percentage workflow');

    // 2. Create a workflow with specific approver rule (CFO auto-approval)
    console.log('2. Creating workflow with specific approver rule...');
    const specificWorkflow = await client.query(`
      INSERT INTO approval_workflows (company_id, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      companyId,
      'CFO Auto-Approval Workflow',
      'CFO can auto-approve any expense',
      true
    ]);
    const specificWorkflowId = specificWorkflow.rows[0].id;

    // Create workflow step
    const specificStep = await client.query(`
      INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [specificWorkflowId, 1, 'Executive Review', 'user', adminId]);

    // Create workflow condition for specific approver rule
    await client.query(`
      INSERT INTO workflow_conditions (workflow_id, condition_type, specific_approver_id, auto_approve_on_specific)
      VALUES ($1, $2, $3, $4)
    `, [specificWorkflowId, 'specific_approver', adminId, true]);

    console.log('✓ Created specific approver workflow');

    // 3. Create a hybrid workflow (50% OR Admin approval)
    console.log('3. Creating hybrid workflow...');
    const hybridWorkflow = await client.query(`
      INSERT INTO approval_workflows (company_id, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      companyId,
      'Flexible Hybrid Workflow',
      'Requires either 50% team approval OR admin approval',
      true
    ]);
    const hybridWorkflowId = hybridWorkflow.rows[0].id;

    // Create workflow step with multiple approvers
    const hybridStep = await client.query(`
      INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_role_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [hybridWorkflowId, 1, 'Flexible Review', 'role', 2]);

    // Add admin as additional approver
    await client.query(`
      INSERT INTO workflow_steps (workflow_id, step_number, step_name, approver_type, approver_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [hybridWorkflowId, 1, 'Executive Override', 'user', adminId]);

    // Create workflow condition for hybrid rule
    await client.query(`
      INSERT INTO workflow_conditions (workflow_id, condition_type, percentage_required, specific_approver_id, auto_approve_on_specific)
      VALUES ($1, $2, $3, $4, $5)
    `, [hybridWorkflowId, 'hybrid', 50, adminId, true]);

    console.log('✓ Created hybrid workflow');

    // 4. Update workflow rules to use the new workflows
    console.log('4. Creating workflow rules...');
    
    // Rule for small expenses (under $500) - use percentage workflow
    await client.query(`
      INSERT INTO workflow_rules (workflow_id, company_id, min_amount, max_amount, currency)
      VALUES ($1, $2, $3, $4, $5)
    `, [percentageWorkflowId, companyId, 0, 500, 'USD']);

    // Rule for medium expenses ($500-$2000) - use hybrid workflow  
    await client.query(`
      INSERT INTO workflow_rules (workflow_id, company_id, min_amount, max_amount, currency)
      VALUES ($1, $2, $3, $4, $5)
    `, [hybridWorkflowId, companyId, 500, 2000, 'USD']);

    // Rule for large expenses (over $2000) - use specific approver workflow
    await client.query(`
      INSERT INTO workflow_rules (workflow_id, company_id, min_amount, currency)
      VALUES ($1, $2, $3, $4)
    `, [specificWorkflowId, companyId, 2000, 'USD']);

    console.log('✓ Created workflow rules');

    await client.query('COMMIT');
    console.log('\n🎉 Successfully set up approval workflows with percentage rules!');
    console.log('\nWorkflow Summary:');
    console.log('• Small expenses (<$500): 60% team approval required');
    console.log('• Medium expenses ($500-$2000): 50% team approval OR admin auto-approval');
    console.log('• Large expenses (>$2000): Admin approval required (auto-approve)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up workflows:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupApprovalWorkflowsWithPercentageRules();