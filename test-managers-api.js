const axios = require('axios');

async function testManagersAPI() {
  try {
    // First login to get token
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@acme.com',
      password: 'Password123!'
    });

    const token = loginResponse.data.token;
    console.log('✓ Login successful, token obtained');

    // Test managers endpoint
    console.log('\n2. Testing managers endpoint...');
    const managersResponse = await axios.get('http://localhost:5000/api/users/managers', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✓ Managers API response:');
    console.log('Status:', managersResponse.status);
    console.log('Data:', JSON.stringify(managersResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testManagersAPI();