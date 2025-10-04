const axios = require('axios');

async function simpleTest() {
  try {
    console.log('Testing signup...');
    
    const signupData = {
      email: 'test@example.com',
      password: 'Test123!',
      name: 'Test User',
      role: 'employee',
      companyName: 'Test Company',
      countryCode: 'US',
      adminName: 'Test Admin'
    };
    
    // Also update login password
    const loginData = {
      email: 'test@example.com',
      password: 'Test123!'
    };
    
    const response = await axios.post('http://localhost:5000/api/auth/signup', signupData);
    console.log('✅ Signup successful:', response.data);
    
    // Now try login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', loginData);
    console.log('✅ Login successful:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

simpleTest();