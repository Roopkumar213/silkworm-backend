// test_api.js - Test your backend API
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
let authToken = '';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

// Helper function for formatted output
function log(emoji, message, data = null) {
  console.log(`\n${emoji} ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Test 1: Health Check
async function testHealthCheck() {
  try {
    log('🏥', 'Testing Health Check...');
    const response = await axios.get(`${BASE_URL}/health`);
    log('✅', 'Health check passed!', response.data);
    return true;
  } catch (error) {
    log('❌', 'Health check failed!', error.message);
    return false;
  }
}

// Test 2: Signup
async function testSignup() {
  try {
    log('📝', 'Testing Signup...');
    const response = await axios.post(`${BASE_URL}/auth/signup`, {
      name: 'Ravi Kumar',
      email: 'ravi.test@example.com',
      phone: '9876543210',
      password: 'password123',
      role: 'farmer',
      village: 'Ramanagara',
      language: 'kannada'
    });
    
    authToken = response.data.data.token;
    log('✅', 'Signup successful!', {
      user: response.data.data.user,
      token: authToken.substring(0, 20) + '...'
    });
    return true;
  } catch (error) {
    if (error.response?.data?.message?.includes('already exists')) {
      log('⚠️', 'User already exists, trying login...');
      return await testLogin();
    }
    log('❌', 'Signup failed!', error.response?.data || error.message);
    return false;
  }
}

// Test 3: Login
async function testLogin() {
  try {
    log('🔐', 'Testing Login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ravi.test@example.com',
      password: 'password123'
    });
    
    authToken = response.data.data.token;
    log('✅', 'Login successful!', {
      user: response.data.data.user,
      token: authToken.substring(0, 20) + '...'
    });
    return true;
  } catch (error) {
    log('❌', 'Login failed!', error.response?.data || error.message);
    return false;
  }
}

// Test 4: Get User Info
async function testGetUserInfo() {
  try {
    log('👤', 'Testing Get User Info...');
    const response = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('✅', 'User info retrieved!', response.data.data.user);
    return true;
  } catch (error) {
    log('❌', 'Get user info failed!', error.response?.data || error.message);
    return false;
  }
}

// Test 5: Upload Image (requires FastAPI running)
async function testUploadImage(imagePath) {
  try {
    log('📤', 'Testing Image Upload...');
    
    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      log('⚠️', `Image file not found: ${imagePath}`);
      log('💡', 'To test upload: Create a test image and update the path in this script');
      return false;
    }

    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    
    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`
      },
      timeout: 30000
    });
    
    log('✅', 'Image uploaded and analyzed!', response.data.data);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      log('⚠️', 'Image file not found. Skipping upload test.');
    } else if (error.response?.status === 503) {
      log('⚠️', 'FastAPI service not running. Make sure AI service is running on port 8000');
    } else {
      log('❌', 'Upload failed!', error.response?.data || error.message);
    }
    return false;
  }
}

// Test 6: Get Upload History
async function testGetHistory() {
  try {
    log('📚', 'Testing Get Upload History...');
    const response = await axios.get(`${BASE_URL}/upload/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('✅', 'Upload history retrieved!', {
      total: response.data.data.pagination.total,
      uploads: response.data.data.uploads.length
    });
    return true;
  } catch (error) {
    log('❌', 'Get history failed!', error.response?.data || error.message);
    return false;
  }
}

// Test 7: Get Statistics
async function testGetStats() {
  try {
    log('📊', 'Testing Get Statistics...');
    const response = await axios.get(`${BASE_URL}/upload/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('✅', 'Statistics retrieved!', response.data.data);
    return true;
  } catch (error) {
    log('❌', 'Get stats failed!', error.response?.data || error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n' + '='.repeat(50));
  console.log('🧪 SERICARE BACKEND API TESTS');
  console.log('='.repeat(50));
  
  const results = {
    passed: 0,
    failed: 0
  };

  // Test 1: Health Check
  if (await testHealthCheck()) results.passed++; else results.failed++;
  
  // Test 2: Signup
  if (await testSignup()) results.passed++; else results.failed++;
  
  // Test 3: Get User Info
  if (await testGetUserInfo()) results.passed++; else results.failed++;
  
  // Test 4: Upload Image (optional - requires image file and FastAPI)
  const testImagePath = 'test_silkworm.jpg'; // Change this to your test image path
  if (await testUploadImage(testImagePath)) results.passed++; else results.failed++;
  
  // Test 5: Get History
  if (await testGetHistory()) results.passed++; else results.failed++;
  
  // Test 6: Get Stats
  if (await testGetStats()) results.passed++; else results.failed++;
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`${colors.green}✅ Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${results.failed}${colors.reset}`);
  console.log('='.repeat(50) + '\n');
}

// Run tests
runAllTests().catch(console.error);