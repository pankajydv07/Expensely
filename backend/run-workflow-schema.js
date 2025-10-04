const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function runWorkflowSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Running approval workflow schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'approval_workflow_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await client.query(schema);
    
    console.log('✅ Approval workflow schema created successfully!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Workflow tables already exist, skipping schema creation');
    } else {
      console.error('Error running schema:', error);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runWorkflowSchema();