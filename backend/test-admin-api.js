const jwt = require('jsonwebtoken');

// Create a test JWT token for admin user
const adminUserId = 'dad6b588-266d-4d41-8e58-b8a80796a880';
const token = jwt.sign({ userId: adminUserId, role: 'admin' }, 'your_super_secret_jwt_key_change_this_in_production');

console.log('Testing Admin API endpoints...\n');

// Test pending approvals
fetch('http://localhost:5000/api/approvals/pending', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Pending Approvals Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});