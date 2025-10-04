const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function fixEmployeePasswords() {
  try {
    console.log('Fixing employee passwords...');
    const password = 'Password123!';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update all user passwords
    const result = await pool.query(
      'UPDATE users SET password_hash = $1',
      [hashedPassword]
    );
    
    console.log('Updated', result.rowCount, 'user passwords');
    console.log('✅ All users can now login with: Password123!');
    
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    await pool.end();
  }
}

fixEmployeePasswords();