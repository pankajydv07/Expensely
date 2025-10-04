const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data  
const timestamp = Date.now();
const testUsers = [
  { 
    email: `employee${timestamp}@test.com`, 
    password: 'Test123!', 
    name: 'John Employee', 
    role: 'employee',
    countryCode: 'US',
    adminName: 'John Employee'
  },
  { 
    email: `manager${timestamp}@test.com`, 
    password: 'Test123!', 
    name: 'Jane Manager', 
    role: 'manager',
    countryCode: 'US', 
    adminName: 'Jane Manager'
  },
];

const testExpenses = [
  {
    title: 'Business Lunch',
    description: 'Business lunch with client',
    originalAmount: 85.50,
    originalCurrency: 'USD',
    categoryId: 1,
    dateOfExpense: '2024-01-15',
    paymentMethod: 'credit_card',
    vendor: 'Restaurant ABC'
  },
  {
    title: 'Conference Flight',
    description: 'Flight tickets for conference',
    originalAmount: 450.00,
    originalCurrency: 'USD',
    categoryId: 2,
    dateOfExpense: '2024-01-16',
    paymentMethod: 'credit_card',
    vendor: 'Airlines XYZ'
  },
  {
    title: 'Hotel Stay',
    description: 'Hotel accommodation',
    originalAmount: 180.00,
    originalCurrency: 'USD',  
    categoryId: 3,
    dateOfExpense: '2024-01-17',
    paymentMethod: 'credit_card',
    vendor: 'Hotel DEF'
  }
];

async function createTestData() {
  try {
    console.log('🔄 Creating test data for approval system...\n');

    // First, let's test if the API is responding
    try {
      const healthCheck = await axios.get(`${API_BASE.replace('/api', '')}/health`);
      console.log('✅ API server is running');
    } catch (error) {
      console.error('❌ API server is not responding');
      return;
    }

    // First, let's create/login users
    let employeeToken, managerToken;

    // Try to signup employee (create new company)
    try {
      const employeeSignup = await axios.post(`${API_BASE}/auth/signup`, {
        ...testUsers[0],
        companyName: 'Demo Company ' + Date.now()
      });
      employeeToken = employeeSignup.data.data.token;
      console.log('✅ Employee user created with new company');
    } catch (error) {
      console.log('Employee signup failed:', error.response?.data?.error || error.response?.data?.errors);
      // User might already exist, try login
      try {
        const employeeLogin = await axios.post(`${API_BASE}/auth/login`, {
          email: testUsers[0].email,
          password: testUsers[0].password
        });
        employeeToken = employeeLogin.data.data.token;
        console.log('✅ Employee user logged in');
      } catch (loginError) {
        console.error('❌ Failed to create/login employee:', loginError.response?.data);
        return;
      }
    }

    // Try to signup manager (different company for test)
    try {
      const managerSignup = await axios.post(`${API_BASE}/auth/signup`, {
        ...testUsers[1],
        companyName: 'Manager Co ' + Date.now()  // Different company for manager test
      });
      managerToken = managerSignup.data.data.token;
      console.log('✅ Manager user created');
    } catch (error) {
      console.log('Manager signup failed:', error.response?.data?.error || error.response?.data?.errors);
      // User might already exist, try login
      try {
        const managerLogin = await axios.post(`${API_BASE}/auth/login`, {
          email: testUsers[1].email,
          password: testUsers[1].password
        });
        managerToken = managerLogin.data.data.token;
        console.log('✅ Manager user logged in');
      } catch (loginError) {
        console.error('❌ Failed to create/login manager:', loginError.response?.data);
        return;
      }
    }

    // Create expenses as employee
    console.log('\n🔄 Creating expenses...');
    const createdExpenses = [];

    for (const expense of testExpenses) {
      try {
        const response = await axios.post(`${API_BASE}/expenses`, expense, {
          headers: { Authorization: `Bearer ${employeeToken}` }
        });
        createdExpenses.push(response.data.data);
        console.log(`✅ Created expense: ${expense.description}`);
      } catch (error) {
        console.error(`❌ Failed to create expense: ${expense.description}`, error.response?.data);
      }
    }

    // Submit expenses for approval
    console.log('\n🔄 Submitting expenses for approval...');
    for (const expense of createdExpenses) {
      try {
        await axios.post(`${API_BASE}/expenses/${expense.id}/submit`, {}, {
          headers: { Authorization: `Bearer ${employeeToken}` }
        });
        console.log(`✅ Submitted expense for approval: ${expense.description}`);
      } catch (error) {
        console.error(`❌ Failed to submit expense: ${expense.description}`, error.response?.data);
      }
    }

    // Test the approval API
    console.log('\n🔄 Testing approval system...');
    try {
      const pendingApprovals = await axios.get(`${API_BASE}/approvals/pending`, {
        headers: { Authorization: `Bearer ${managerToken}` }
      });
      console.log(`✅ Found ${pendingApprovals.data.data.length} pending approvals`);
      
      if (pendingApprovals.data.data.length > 0) {
        console.log('\n📋 Pending approvals:');
        pendingApprovals.data.data.forEach((expense, index) => {
          console.log(`${index + 1}. ${expense.description} - ${expense.amount} ${expense.currency}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to get pending approvals:', error.response?.data);
    }

    console.log('\n🎉 Test data creation completed!');
    console.log('\n📝 Test accounts created:');
    console.log('👤 Employee: employee@test.com / test123');
    console.log('👤 Manager: manager@test.com / test123');
    console.log('\n🌐 Access the application at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  }
}

// Run the test
createTestData();