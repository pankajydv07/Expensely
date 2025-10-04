const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function demonstratePercentageRules() {
  console.log('🎯 Demonstrating Percentage-Based Approval Rules\n');
  console.log('============================================\n');

  try {
    // Get the test expense details
    const expense = await pool.query(`
      SELECT 
        e.id, e.title, e.company_amount, e.company_currency,
        ew.id as workflow_instance_id,
        w.name as workflow_name
      FROM expenses e
      JOIN expense_workflows ew ON e.id = ew.expense_id
      JOIN approval_workflows w ON ew.workflow_id = w.id
      WHERE e.title = $1
    `, ['Team Building Event Supplies']);

    if (expense.rows.length === 0) {
      console.log('❌ Test expense not found. Please run create-test-expense.js first.');
      return;
    }

    const expenseData = expense.rows[0];
    console.log(`📄 Test Expense: ${expenseData.title}`);
    console.log(`💰 Amount: ${expenseData.company_currency} ${expenseData.company_amount}`);
    console.log(`🔄 Workflow: ${expenseData.workflow_name}`);

    // Get workflow conditions
    const conditions = await pool.query(`
      SELECT condition_type, percentage_required, specific_approver_id, auto_approve_on_specific
      FROM workflow_conditions 
      WHERE workflow_id = (SELECT workflow_id FROM expense_workflows WHERE expense_id = $1)
    `, [expenseData.id]);

    console.log(`\n📋 Approval Rules:`);
    conditions.rows.forEach(condition => {
      if (condition.condition_type === 'percentage') {
        console.log(`   • Percentage Rule: ${condition.percentage_required}% approval required`);
      } else if (condition.condition_type === 'specific_approver') {
        console.log(`   • Specific Approver Rule: Auto-approve = ${condition.auto_approve_on_specific}`);
      } else if (condition.condition_type === 'hybrid') {
        console.log(`   • Hybrid Rule: ${condition.percentage_required}% OR specific approver`);
      }
    });

    // Get current approvers
    const approvers = await pool.query(`
      SELECT 
        wa.approver_id, wa.status, u.name, u.email
      FROM workflow_approvals wa
      JOIN users u ON wa.approver_id = u.id
      WHERE wa.expense_workflow_id = $1
      ORDER BY u.name
    `, [expenseData.workflow_instance_id]);

    console.log(`\n👥 Current Approvers (${approvers.rows.length} total):`);
    approvers.rows.forEach((approver, index) => {
      const statusIcon = approver.status === 'approved' ? '✅' : 
                        approver.status === 'rejected' ? '❌' : '⏳';
      console.log(`   ${index + 1}. ${statusIcon} ${approver.name} (${approver.email}) - ${approver.status}`);
    });

    // Calculate current progress
    const approvedCount = approvers.rows.filter(a => a.status === 'approved').length;
    const currentPercentage = Math.round((approvedCount / approvers.rows.length) * 100);
    const requiredPercentage = conditions.rows.find(c => c.condition_type === 'percentage')?.percentage_required || 0;

    console.log(`\n📊 Current Progress:`);
    console.log(`   Approved: ${approvedCount}/${approvers.rows.length} (${currentPercentage}%)`);
    console.log(`   Required: ${requiredPercentage}%`);
    console.log(`   Status: ${currentPercentage >= requiredPercentage ? '✅ Ready for approval' : '⏳ Waiting for more approvals'}`);

    console.log(`\n🎭 Demo Scenarios:`);
    console.log(`\n1. **Frontend Display Test:**`);
    console.log(`   • Login as Bob Employee (bob@acme.com / Password123!)`);
    console.log(`   • Go to Employee Dashboard`);
    console.log(`   • Check the "Team Building Event Supplies" expense`);
    console.log(`   • You should see: Progress bar, percentage, and rule indicators`);

    console.log(`\n2. **Percentage Rule Test:**`);
    console.log(`   • Login as John Manager (john.manager@acme.com / Password123!)`);  
    console.log(`   • Approve the expense (progress becomes 50%)`);
    console.log(`   • Progress bar updates but expense still pending (needs 60%)`);

    console.log(`\n3. **Rule Completion Test:**`);
    console.log(`   • Login as Sarah Manager (sarah.manager@acme.com / Password123!)`);
    console.log(`   • Approve the expense (progress becomes 100%)`);
    console.log(`   • Expense gets automatically approved (100% > 60% required)`);

    console.log(`\n4. **API Testing:**`);
    console.log(`   • Use the test-approval-progress.js script to see backend data`);
    console.log(`   • Check admin panel for pending approvals`);
    console.log(`   • Monitor server logs for approval progress calculations`);

    console.log(`\n🚀 Ready to test! Open http://localhost:3001 and start exploring.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

demonstratePercentageRules();