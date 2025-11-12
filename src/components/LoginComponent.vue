<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login</h2>
      
      <!-- Boat detection banner -->
      <div v-if="localBoatId" class="boat-banner">
        <div class="boat-icon">🚤</div>
        <div class="boat-text">
          Boat "{{ detectedBoatName }}" detected on local Wi-Fi.<br>
          <small>It will be added to your fleet after login.</small>
        </div>
      </div>
      
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
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useBoatConnectionStore } from '@/stores/boatConnection';
import { relayConnectionBridge } from '@/relay/client/RelayConnectionBridge.js';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const localBoatId = ref(null);
const detectedBoatName = ref('');

// Get local API URL from environment variables
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://192.168.68.56:3009';
const DEMO_USERNAME = 'demo@compendiumnav.com';
const DEMO_LOGIN_URL = 'https://compendiumnav-demo.com/relay/api/login';
const DEMO_RELAY_URL = 'wss://compendiumnav-demo.com/relay';
const PRODUCTION_RELAY_URL = 'wss://compendiumnav.com/relay';
const PRODUCTION_LOGIN_URL = 'https://compendiumnav.com/relay/api/login';
const router = useRouter();
const boatConnectionStore = useBoatConnectionStore();

// Detect local boat on mount
onMounted(async () => {
  try {
    const boat = await boatConnectionStore.initializeConnection();
    if (boat?.boatId) {
      localBoatId.value = boat.boatId;
      detectedBoatName.value = boat.name || boat.boatId;
    }
  } catch (err) {
    console.warn('Local boat detection failed:', err);
  }
});

// Note: We're hardcoding the VPS URLs for diagnostic purposes

// Note: We're not currently using emit events, but keeping the definition for future use
// const emit = defineEmits(['login-success']);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  
  // Simplify payload to exactly match what the server expects
  const payload = {
    username: email.value,
    password: password.value,
    ...(localBoatId.value && { localBoatId: localBoatId.value })
  };
  
  console.log(`[LOGIN] Attempting login with payload:`, { username: payload.username, password: '******' });
  const normalizedUsername = typeof payload.username === 'string' ? payload.username.trim().toLowerCase() : '';
  const isDemoUser = normalizedUsername === DEMO_USERNAME;

  // Define API endpoints to try based on account type
  const endpoints = isDemoUser
    ? [{ name: 'Demo Relay Login', url: DEMO_LOGIN_URL }]
    : [
        { name: 'Relay API (HTTPS)', url: PRODUCTION_LOGIN_URL },
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
      relayConnectionBridge.setRelayServerUrl(isDemoUser ? DEMO_RELAY_URL : PRODUCTION_RELAY_URL);
      console.log('[LOGIN] Response payload:', response.data);
      
      // Set authentication flag for key-based authentication
      localStorage.setItem('isAuthenticated', 'true');
      
      // Auto-pair local boat if detected
      console.log('[LOGIN] Setting up boat IDs from server response...');
      
      // Ensure local boat ID is used when available
      let boatIds = [];
      
      // Get server boats
      if (response.data.boats && Array.isArray(response.data.boats)) {
        boatIds = response.data.boats.map(b => b.boatId || b.id || b.boat_id);
      }
      
      // Check if we have a boat ID from the store (direct connection)
      const storeBoatId = boatConnectionStore?.boatId ?? null;
      const isDirectConnected = !!boatConnectionStore?.directConnected;
      
      // Always prefer store boat ID (direct connection) or local detected boat
      const preferredBoatId = storeBoatId || localBoatId.value;
      
      if (preferredBoatId) {
        boatIds = [preferredBoatId, ...boatIds.filter(id => id !== preferredBoatId)];
        boatConnectionStore.setActiveBoatId(preferredBoatId);
        console.log('[LOGIN] Using boat ID:', preferredBoatId, isDirectConnected ? '(direct connection)' : '(local detection)');
        
        // Register boat with VPS to associate it with the user
        try {
          console.log('[LOGIN] Registering boat with VPS...');
          await boatConnectionStore.registerWithVPS(preferredBoatId);
          console.log('[LOGIN] Boat registered with VPS successfully');
        } catch (err) {
          console.warn('[LOGIN] Failed to register boat with VPS:', err);
          // Continue anyway - this is non-critical
        }
      } else if (boatIds.length > 0) {
        boatConnectionStore.setActiveBoatId(boatIds[0]);
        console.log('[LOGIN] Using first server boat ID:', boatIds[0]);
      }
      
      localStorage.setItem('boatIds', JSON.stringify(boatIds));

      // Redirect to home after login - use router.push only, not window.location
      console.log('[LOGIN] Redirecting to home page');
      router.push('/home');
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
  background: #fff !important;
  color: #111 !important;
  border-color: #bbb !important;
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
