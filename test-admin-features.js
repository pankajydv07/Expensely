const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testAdminFeatures() {
  try {
    console.log('🔄 Testing Admin Dashboard Features...\n');

    // Try to login as admin from our previous test
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'Test123!'
    });

    const adminToken = adminLogin.data.data.token;
    console.log('✅ Admin logged in successfully');

    // Test getting users
    try {
      const usersResponse = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ Retrieved ${usersResponse.data.data.length} users`);
    } catch (error) {
      console.log('❌ Failed to get users:', error.response?.data?.error);
    }

    // Test getting managers
    try {
      const managersResponse = await axios.get(`${API_BASE}/users/managers`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ Retrieved ${managersResponse.data.data.length} managers`);
    } catch (error) {
      console.log('❌ Failed to get managers:', error.response?.data?.error);
    }

    // Test getting user stats
    try {
      const statsResponse = await axios.get(`${API_BASE}/users/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Retrieved user statistics:', statsResponse.data.data);
    } catch (error) {
      console.log('❌ Failed to get user stats:', error.response?.data?.error);
    }

    console.log('\n🎉 Admin features test completed!');
    console.log('\n📝 You can now:');
    console.log('👤 Login as admin: test@example.com / Test123!');
    console.log('🌐 Access the admin dashboard at: http://localhost:3000');
    console.log('🛠️ Manage users, categories, and system settings');

  } catch (error) {  
    console.error('❌ Error testing admin features:', error.response?.data || error.message);
  }
}

testAdminFeatures();