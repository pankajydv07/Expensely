console.log('Testing expense with approval progress...\n');

// Test the expense service with the new approval progress
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'bob@acme.com',
    password: 'Password123!'
  })
})
.then(response => response.json())
.then(loginData => {
  if (loginData.success && loginData.data && loginData.data.token) {
    console.log('✅ Login successful for Bob Employee');
    
    // Get expenses to see approval progress
    return fetch('http://localhost:5000/api/expenses', {
      headers: {
        'Authorization': `Bearer ${loginData.data.token}`,
        'Content-Type': 'application/json'
      }
    });
  } else {
    throw new Error('Login failed');
  }
})
.then(response => response.json())
.then(expensesData => {
  console.log('\n📊 Expenses Response:');
  
  if (expensesData.success && expensesData.data) {
    const expenses = expensesData.data;
    console.log(`Found ${expenses.length} expenses\n`);
    
    expenses.forEach((expense, index) => {
      console.log(`${index + 1}. ${expense.title} - ${expense.company_currency} ${expense.company_amount}`);
      console.log(`   Status: ${expense.status}`);
      
      if (expense.approvalProgress) {
        console.log('   🎯 Approval Progress:');
        console.log(`      Current Percentage: ${expense.approvalProgress.currentPercentage}%`);
        console.log(`      Approved Count: ${expense.approvalProgress.approvedCount}/${expense.approvalProgress.totalApprovers}`);
        console.log(`      Status Message: ${expense.approvalProgress.statusMessage}`);
        console.log(`      Workflow: ${expense.approvalProgress.workflowName}`);
        console.log(`      Has Percentage Rule: ${expense.approvalProgress.hasPercentageRule}`);
        console.log(`      Has Specific Approver Rule: ${expense.approvalProgress.hasSpecificApproverRule}`);
        console.log(`      Has Hybrid Rule: ${expense.approvalProgress.hasHybridRule}`);
        
        if (expense.approvalProgress.percentageRule) {
          console.log(`      📈 Percentage Rule: ${expense.approvalProgress.percentageRule.current}% / ${expense.approvalProgress.percentageRule.required}% required`);
          console.log(`         Satisfied: ${expense.approvalProgress.percentageRule.satisfied}`);
        }
        
        if (expense.approvalProgress.hybridRule) {
          console.log(`      🔄 Hybrid Rule: ${expense.approvalProgress.hybridRule.percentageRequired}% OR Specific Approver`);
          console.log(`         Overall Satisfied: ${expense.approvalProgress.hybridRule.overallSatisfied}`);
          console.log(`         Satisfied By: ${expense.approvalProgress.hybridRule.satisfiedBy}`);
        }
      } else if (expense.status === 'waiting_approval') {
        console.log('   ⚠️  No approval progress data (might not be using workflow system)');
      } else {
        console.log('   ℹ️  No approval progress needed');
      }
      console.log('');
    });
  } else {
    console.log('❌ Failed to get expenses:', expensesData);
  }
})
.catch(error => {
  console.error('Error:', error);
});