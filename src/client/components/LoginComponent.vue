<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login</h2>
      <div class="form-group">
        <label for="email">Email</label>
        <input v-model="email" id="email" type="email" autocomplete="username" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input v-model="password" id="password" type="password" autocomplete="current-password" required />
      </div>
      <div v-if="error" class="error">{{ error }}</div>
      <button type="submit" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
      <div style="margin-top: 1em;">
        <router-link to="/forgot-password">Forgot Password?</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// Get local API URL from environment variables
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://192.168.68.56:3009';
const router = useRouter();

// Note: We're hardcoding the VPS URLs for diagnostic purposes

// Note: We're not currently using emit events, but keeping the definition for future use
// const emit = defineEmits(['login-success']);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  
  // Simplify payload to exactly match what the server expects
  const payload = {
    username: email.value,
    password: password.value
    // Remove email field as the server doesn't use it
  };
  
  console.log(`[LOGIN] Attempting login with payload:`, { username: payload.username, password: '******' });
  
  // Define all possible API endpoints to try
  const endpoints = [
    { name: 'Key-Based Login', url: `https://compendiumnav.com/api/user-login` },
    { name: 'VPS API (HTTPS)', url: `https://compendiumnav.com/api/login` },
    { name: 'VPS API (HTTP)', url: `http://compendiumnav.com/api/login` },
    { name: 'Local API', url: `${LOCAL_API_URL}/api/login` }
  ];
  
  console.log(`[LOGIN] Will try ${endpoints.length} different API endpoints`);
  
  let response = null;
  let lastError = null;
  
  try {
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        console.log(`[LOGIN] Attempting login with ${endpoint.name}: ${endpoint.url}`);
        
        // Add timeout to prevent hanging requests
        response = await axios.post(endpoint.url, payload, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`[LOGIN] Success with ${endpoint.name}:`, response.status);
        break; // Exit the loop if successful
      } catch (err) {
        // Log detailed error information
        console.log(`[LOGIN] Failed with ${endpoint.name}: ${err.message}`);
        
        if (err.response) {
          // The server responded with an error status
          console.log(`[LOGIN] Server responded with status: ${err.response.status}`);
          console.log(`[LOGIN] Response data:`, err.response.data);
        } else if (err.request) {
          // The request was made but no response was received
          console.log(`[LOGIN] No response received from server`);
        }
        
        lastError = err;
        // Continue to the next endpoint
      }
    }
    
    // If we've tried all endpoints and still have no response, throw the last error
    if (!response && lastError) {
      throw lastError;
    }
    
    // Process the response
    if (response && response.data && response.data.success) {
      console.log('[LOGIN] Login successful, processing response');
      
      // Set authentication flag for key-based authentication
      localStorage.setItem('isAuthenticated', 'true');
      
      // Store boat IDs as an array under 'boatIds'
      if (response.data.boats && Array.isArray(response.data.boats)) {
        const boatIds = response.data.boats.map(b => b.boatId);
        localStorage.setItem('boatIds', JSON.stringify(boatIds));
        
        // Set activeBoatId if not already set
        if (boatIds.length > 0) {
          localStorage.setItem('activeBoatId', boatIds[0]);
        } else {
          localStorage.setItem('activeBoatId', null);
        }
      }
      
      // Redirect to home after login - use router.push only, not window.location
      console.log('[LOGIN] Redirecting to home page');
      router.push('/');
    } else if (response && response.data) {
      error.value = response.data.error || 'Login failed. Please check your credentials.';
      console.error('[LOGIN] Login failed:', response.data.error || 'Unknown error');
    } else {
      error.value = 'Login failed. No response data received.';
      console.error('[LOGIN] Login failed: No response data');
    }
  } catch (err) {
    console.error('[LOGIN] Error during login:', err);
    
    // More specific error messages based on the error type
    if (err.code === 'ECONNABORTED') {
      error.value = 'Connection timed out. Please try again.';
    } else if (err.response) {
      // The server responded with an error status
      error.value = err.response.data?.error || `Server error: ${err.response.status}`;
    } else if (err.request) {
      // The request was made but no response was received
      error.value = 'No response from server. Please check your internet connection.';
    } else {
      // Something else caused the error
      error.value = 'Login failed. Please try again later.';
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  max-width: 350px;
  margin: 2rem auto;
  padding: 2rem 2.5rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.login-form h2 {
  margin-bottom: 1.5rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}
input[type="text"], input[type="email"], input[type="password"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
button[type="submit"] {
  width: 100%;
  padding: 0.7rem;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #d32f2f;
  margin-bottom: 1rem;
  text-align: center;
}
</style>
