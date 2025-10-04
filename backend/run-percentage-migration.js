const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function runMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../database/percentage_approval_migration.sql'), 
      'utf8'
    );
    
    console.log('Running percentage approval migration...');
    await pool.query(migrationSql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    console.log('\nVerifying migration results:');
    
    const workflowConditions = await pool.query(`
      SELECT wc.*, w.name as workflow_name, u.name as approver_name
      FROM workflow_conditions wc
      JOIN approval_workflows w ON wc.workflow_id = w.id
      LEFT JOIN users u ON wc.specific_approver_id = u.id
      ORDER BY wc.condition_type, w.name
    `);
    
    console.log('Workflow conditions created:');
    workflowConditions.rows.forEach(row => {
      console.log(`  - ${row.workflow_name}: ${row.condition_type}${
        row.percentage_required ? ` (${row.percentage_required}%)` : ''
      }${row.approver_name ? ` - Specific approver: ${row.approver_name}` : ''}`);
    });
    
    const progressTable = await pool.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'approval_progress'
    `);
    
    console.log(`\nApproval progress table: ${progressTable.rows[0].count > 0 ? '✅ Created' : '❌ Missing'}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();