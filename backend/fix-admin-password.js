const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Database configuration from .env
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'expensely_db',
  user: 'postgres',
  password: '12345'
});

async function updateAdminPassword() {
  try {
    console.log('Generating password hash for "Password123!"...');
    const password = 'Password123!';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('Hash generated:', hashedPassword);
    
    console.log('Updating admin user password in database...');
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, 'admin@acme.com']
    );
    
    console.log('Updated rows:', result.rowCount);
    
    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('You can now login with:');
      console.log('  Email: admin@acme.com');
      console.log('  Password: Password123!');
    } else {
      console.log('❌ No user found with email admin@acme.com');
    }
    
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();