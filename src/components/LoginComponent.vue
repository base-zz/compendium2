<template>
  <div class="login-container">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>Login</h2>
      
      <!-- Boat detection banner -->
      <div v-if="detectedBoatId" class="boat-banner">
        <div class="boat-icon">🚤</div>
        <div class="boat-text">
          <strong>Boat "{{ detectedBoatName }}" detected on local Wi-Fi.</strong><br>
          <small v-if="pairingConsent === true">
            This boat will be added to your fleet after you log in.
          </small>
          <small v-else-if="pairingConsent === false">
            You chose not to add this boat right now. You can change your mind below.
          </small>
          <small v-else>
            We can add it to your fleet after login if you confirm below.
          </small>
        </div>
        <div class="boat-actions">
          <button
            type="button"
            class="primary"
            @click="openPairingPrompt"
            :disabled="pairingConsent === true"
          >
            {{ pairingConsent === true ? 'Pairing Confirmed' : 'Add to your fleet' }}
          </button>
          <button
            v-if="pairingConsent === true"
            type="button"
            class="link"
            @click="openPairingPrompt"
          >Change</button>
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

  <!-- Pairing confirmation modal -->
  <div v-if="showPairModal" class="pair-modal-overlay" @click.self="dismissPairingPrompt">
    <div class="pair-modal">
      <h3>Boat detected</h3>
      <p>
        Boat "{{ detectedBoatName }}" detected on local Wi-Fi.<br />
        Add to your fleet?
      </p>
      <div class="pair-modal-actions">
        <button type="button" class="primary" @click="handlePairDecision(true)">Pair & Continue</button>
        <button type="button" class="secondary" @click="handlePairDecision(false)">Skip for now</button>
      </div>
    </div>
  </div>

  <ion-toast
    :is-open="showPairSuccessToast"
    :message="pairSuccessMessage"
    :duration="2500"
    position="bottom"
    @didDismiss="showPairSuccessToast = false"
  ></ion-toast>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useBoatConnectionStore } from '@/stores/boatConnection';
import { relayConnectionBridge } from '@/relay/client/RelayConnectionBridge.js';
import { IonToast } from '@ionic/vue';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const localBoatId = ref(null);
const detectedBoatName = ref('');
const detectedBoatId = ref(null);
const pairingConsent = ref(null); // null = pending, true = pair, false = skip
const showPairModal = ref(false);
const showPairSuccessToast = ref(false);
const pairSuccessMessage = ref('');

// Get local API URL from environment variables
const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL;

if (!LOCAL_API_URL) {
  console.error(
    '[LOGIN] Missing VITE_LOCAL_API_URL environment value. Local API attempts will be skipped.'
  );
}

const RAW_CLIENT_DEBUG =
  import.meta.env.VITE_CLIENT_DEBUG ?? import.meta.env.CLIENT_DEBUG;

if (RAW_CLIENT_DEBUG === undefined) {
  console.warn(
    '[LOGIN] CLIENT_DEBUG flag not set; verbose login logging will remain disabled.'
  );
}

const CLIENT_DEBUG_ENABLED =
  RAW_CLIENT_DEBUG !== undefined && `${RAW_CLIENT_DEBUG}`.toLowerCase() === 'true';

const debugLog = (...args) => {
  if (CLIENT_DEBUG_ENABLED) {
    console.log(...args);
  }
};

const debugWarn = (...args) => {
  if (CLIENT_DEBUG_ENABLED) {
    console.warn(...args);
  }
};
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
      detectedBoatId.value = boat.boatId;
      detectedBoatName.value = boat.name || boat.boatId;
      pairingConsent.value = null;
      showPairModal.value = true;
    }
  } catch (err) {
    debugWarn('Local boat detection failed:', err);
  }
});

const openPairingPrompt = () => {
  if (!detectedBoatId.value) return;
  showPairModal.value = true;
};

const dismissPairingPrompt = () => {
  showPairModal.value = false;
  if (pairingConsent.value === null) {
    pairingConsent.value = false;
  }
};

const handlePairDecision = (shouldPair) => {
  pairingConsent.value = shouldPair;
  showPairModal.value = false;
};

// Note: We're hardcoding the VPS URLs for diagnostic purposes

// Note: We're not currently using emit events, but keeping the definition for future use
// const emit = defineEmits(['login-success']);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  
  // Simplify payload to exactly match what the server expects
  const includeDetectedBoat = pairingConsent.value === true && localBoatId.value;

  const payload = {
    username: email.value,
    password: password.value,
    ...(includeDetectedBoat && { localBoatId: localBoatId.value })
  };
  
  debugLog(`[LOGIN] Attempting login with payload:`, { username: payload.username, password: '******' });
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
        ...(LOCAL_API_URL
          ? [{ name: 'Local API', url: `${LOCAL_API_URL}/api/login` }]
          : [])
      ];
  
  debugLog(`[LOGIN] Will try ${endpoints.length} different API endpoints`);
  
  let response = null;
  let lastError = null;
  
  try {
    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        debugLog(`[LOGIN] Attempting login with ${endpoint.name}: ${endpoint.url}`);
        
        // Add timeout to prevent hanging requests
        response = await axios.post(endpoint.url, payload, {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        debugLog(`[LOGIN] Success with ${endpoint.name}:`, response.status);
        break; // Exit the loop if successful
      } catch (err) {
        // Log detailed error information
        debugLog(`[LOGIN] Failed with ${endpoint.name}: ${err.message}`);
        
        if (err.response) {
          // The server responded with an error status
          debugLog(`[LOGIN] Server responded with status: ${err.response.status}`);
          debugLog(`[LOGIN] Response data:`, err.response.data);
        } else if (err.request) {
          // The request was made but no response was received
          debugLog(`[LOGIN] No response received from server`);
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
      debugLog('[LOGIN] Login successful, processing response');
      relayConnectionBridge.setRelayServerUrl(isDemoUser ? DEMO_RELAY_URL : PRODUCTION_RELAY_URL);
      debugLog('[LOGIN] Response payload:', response.data);
      
      // Set authentication flag for key-based authentication
      localStorage.setItem('isAuthenticated', 'true');
      
      // Auto-pair local boat if detected
      debugLog('[LOGIN] Setting up boat IDs from server response...');
      
      // Ensure local boat ID is used when available
      let boatIds = [];
      
      // Get server boats
      if (response.data.boats && Array.isArray(response.data.boats)) {
        boatIds = response.data.boats.map(b => b.boatId || b.id || b.boat_id);
      }
      
      // Check if we have a boat ID from the store (direct connection)
      const storeBoatId = boatConnectionStore?.boatId ?? null;
      const isDirectConnected = !!boatConnectionStore?.directConnected;
      const storeBoatMatchesDetected = detectedBoatId.value && storeBoatId === detectedBoatId.value;
      
      let preferredBoatId = null;
      let shouldRegisterDetectedBoat = false;
      const userAcceptedDetectedBoat = pairingConsent.value === true && detectedBoatId.value;
      
      if (userAcceptedDetectedBoat) {
        preferredBoatId = storeBoatMatchesDetected ? storeBoatId : detectedBoatId.value;
        shouldRegisterDetectedBoat = true;
      } else if (storeBoatId && !storeBoatMatchesDetected) {
        preferredBoatId = storeBoatId;
      } else if (boatIds.length > 0) {
        preferredBoatId = boatIds[0];
      }
      
      if (preferredBoatId) {
        boatIds = [preferredBoatId, ...boatIds.filter(id => id !== preferredBoatId)];
        boatConnectionStore.setActiveBoatId(preferredBoatId);
        debugLog('[LOGIN] Using boat ID:', preferredBoatId, isDirectConnected ? '(direct connection)' : '(remote connection)');
        
        if (shouldRegisterDetectedBoat) {
          try {
            debugLog('[LOGIN] Registering boat with VPS...');
            await boatConnectionStore.registerWithVPS(preferredBoatId);
            debugLog('[LOGIN] Boat registered with VPS successfully');
            pairSuccessMessage.value = `Boat "${detectedBoatName.value || preferredBoatId}" added to your fleet.`;
            showPairSuccessToast.value = true;
          } catch (err) {
            debugWarn('[LOGIN] Failed to register boat with VPS:', err);
          }
        }
      }
      
      if (!preferredBoatId && boatIds.length > 0) {
        boatConnectionStore.setActiveBoatId(boatIds[0]);
        debugLog('[LOGIN] Using first server boat ID:', boatIds[0]);
      }
      
      localStorage.setItem('boatIds', JSON.stringify(boatIds));

      // Redirect to home after login - use router.push only, not window.location
      debugLog('[LOGIN] Redirecting to home page');
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
.boat-banner {
  display: flex;
  gap: 0.75rem;
  padding: 0.9rem;
  border-radius: 8px;
  background: #e8f3ff;
  border: 1px solid rgba(25, 118, 210, 0.3);
  color: #0c2d4a;
  margin-bottom: 1rem;
}
.boat-icon {
  font-size: 1.5rem;
}
.boat-text small {
  display: block;
  margin-top: 0.25rem;
  color: rgba(12, 45, 74, 0.75);
}
.boat-actions {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-left: auto;
}
.boat-actions .primary {
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-weight: 600;
}
.boat-actions .primary:disabled {
  opacity: 0.6;
  cursor: default;
}
.boat-actions .link {
  background: none;
  border: none;
  color: #1976d2;
  text-decoration: underline;
  padding: 0;
  cursor: pointer;
  font-size: 0.9rem;
}
.pair-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.pair-modal {
  background: #fff;
  padding: 1.5rem;
  border-radius: 10px;
  width: min(90vw, 360px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  text-align: center;
}
.pair-modal h3 {
  margin-bottom: 0.5rem;
}
.pair-modal p {
  margin-bottom: 1rem;
  color: #333;
  line-height: 1.4;
}
.pair-modal-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.pair-modal-actions .primary,
.pair-modal-actions .secondary {
  border: none;
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.pair-modal-actions .primary {
  background: #1976d2;
  color: #fff;
}
.pair-modal-actions .secondary {
  background: #f3f4f6;
  color: #111;
}
</style>
