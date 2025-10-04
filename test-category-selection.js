// Test script to debug category selection issue
const express = require('express');
const cors = require('cors');

// Simple test server to verify API responses
const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint to check categories
app.get('/test-categories', async (req, res) => {
  try {
    // Simulate the same request that frontend makes
    const fetch = require('node-fetch');
    
    const response = await fetch('http://localhost:5000/api/categories', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI4NGYzOGQ1NC05ZjE3LTRmNjYtOTNjYy1jMzJkNjg4MDA0ZmQiLCJlbWFpbCI6ImFkbWluQGFjbWUuY29tIiwicm9sZSI6ImFkbWluIiwiY29tcGFueUlkIjoxLCJpYXQiOjE3MzU3NjEzNzEsImV4cCI6MTczNTg0Nzc3MX0.zHB9ZD6EgxbIj-GQFQAJjr15YXsGNEJeK1NLRJdXc6A'
      }
    });
    
    const data = await response.json();
    
    console.log('Categories API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    res.json({
      status: response.status,
      data: data,
      categories: data.data || []
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Category test server running on http://localhost:3001');
  console.log('Visit http://localhost:3001/test-categories to test');
});