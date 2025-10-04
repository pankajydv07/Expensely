const userService = require('./backend/src/services/userService');

async function testUserManagement() {
  console.log('Testing User Management Service...\n');

  try {
    // Test 1: Get all users
    console.log('1. Testing getUsers...');
    const users = await userService.getUsers(1); // company_id = 1
    console.log(`Found ${users.length} users:`, users);
    console.log('✓ getUsers working\n');

    // Test 2: Get user by ID (use first user from results)
    if (users.length > 0) {
      console.log('2. Testing getUserById...');
      const user = await userService.getUserById(users[0].id, 1);
      console.log('User details:', user);
      console.log('✓ getUserById working\n');
    }

    // Test 3: Get available managers
    console.log('3. Testing getAvailableManagers...');
    const managers = await userService.getAvailableManagers(1);
    console.log(`Found ${managers.length} available managers:`, managers);
    console.log('✓ getAvailableManagers working\n');

    // Test 4: Get user statistics
    console.log('4. Testing getUserStats...');
    const stats = await userService.getUserStats(1);
    console.log('User statistics:', stats);
    console.log('✓ getUserStats working\n');

    console.log('🎉 All user management tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testUserManagement();