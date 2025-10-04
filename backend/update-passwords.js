const bcrypt = require('bcrypt');
const { query } = require('./src/config/db');

async function updatePasswords() {
  try {
    console.log('Generating password hashes...');
    
    // Generate hash for Password123!
    const password = 'Password123!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    console.log('Generated hash:', hashedPassword);
    
    // Update all users with the new hash
    console.log('Updating all users with new password hash...');
    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE company_id = 1',
      [hashedPassword]
    );
    
    console.log(`✓ Updated ${result.rowCount} users with new password`);
    console.log('Password for all users is now: Password123!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating passwords:', error);
    process.exit(1);
  }
}

updatePasswords();