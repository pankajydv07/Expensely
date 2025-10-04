console.log('Testing Admin Login and API endpoints...\n');

// First, login to get a valid token
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'admin@acme.com',
    password: 'Password123!'
  })
})
.then(response => {
  console.log('Login Status:', response.status);
  return response.json();
})
.then(loginData => {
  console.log('Login Response:', JSON.stringify(loginData, null, 2));
  
  if (loginData.success && loginData.data && loginData.data.token) {
    // Now test pending approvals with the actual token
    return fetch('http://localhost:5000/api/approvals/pending', {
      headers: {
        'Authorization': `Bearer ${loginData.data.token}`,
        'Content-Type': 'application/json'
      }
    });
  } else {
    throw new Error('Login failed');
  }
})
.then(response => {
  console.log('\nPending Approvals Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Pending Approvals Response:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});