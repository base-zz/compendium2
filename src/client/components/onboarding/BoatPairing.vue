<template>
  <ion-page>
    <ion-content class="ion-padding" :fullscreen="true">
      <div class="ion-text-center ion-padding">
        <div class="logo-container ion-margin-vertical" style="width: 76.5%; max-width: 270px; margin-left: auto; margin-right: auto;">
          <ion-img 
            src="/img/compendium_logo.png" 
            alt="Compendium Navigation"
            class="logo-image"
            style="width: 100%; height: auto;"
          />
        </div>
        
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ isAlreadyPaired ? 'Already Paired' : 'Connect to Your Boat' }}
            </ion-card-title>
            <ion-card-subtitle v-if="isAlreadyPaired">
              Boat ID: <strong>{{ boatStore.boatId }}</strong>
            </ion-card-subtitle>
            <ion-card-subtitle v-else>
              Get started by connecting to your boat's network
            </ion-card-subtitle>
          </ion-card-header>

          <!-- Already Paired State -->
          <ion-card-content v-if="isAlreadyPaired">
            <div class="ion-text-center ion-padding-vertical">
              <ion-icon 
                :icon="checkmarkCircle" 
                color="success" 
                style="font-size: 64px"
              />
              <p class="ion-padding-vertical">
                You're all set! You can now control your boat.
              </p>
            </div>

            <ion-button 
              expand="block" 
              @click="handleAlreadyPaired"
              class="ion-margin-vertical"
              size="default"
              :disabled="isLoading"
              style="--padding-top: 16px; --padding-bottom: 16px;"
            >
              <ion-spinner v-if="isLoading" name="crescent" class="ion-margin-end"></ion-spinner>
              {{ isLoading ? 'Connecting...' : 'Go to Home' }}
            </ion-button>

            <ion-button 
              expand="block" 
              @click="resetPairing"
              fill="outline"
              color="medium"
              size="default"
              :disabled="isLoading"
              style="--padding-top: 16px; --padding-bottom: 16px;"
            >
              Pair with a different boat
            </ion-button>
          </ion-card-content>

          <!-- Loading State -->
          <ion-card-content v-else-if="isLoading">
            <div class="ion-text-center ion-padding-vertical">
              <ion-spinner name="crescent" style="width: 48px; height: 48px"></ion-spinner>
              <p class="ion-padding-top">Searching for local boat...</p>
            </div>
          </ion-card-content>

          <!-- Error State -->
          <ion-card-content v-else-if="error">
            <ion-item color="light">
              <ion-icon :icon="warning" slot="start" color="danger"></ion-icon>
              <ion-label class="ion-text-wrap">
                {{ error }}
              </ion-label>
            </ion-item>
            
            <ion-button 
              expand="block" 
              @click="retryConnection"
              color="danger"
              fill="clear"
              class="ion-margin-top"
            >
              Try Again
            </ion-button>
          </ion-card-content>

          <!-- Manual Pairing Form -->
          <ion-card-content v-else>
            <ion-list>
              <ion-item-divider>
                <ion-label>Or connect manually</ion-label>
              </ion-item-divider>
              
              <ion-item>
                <ion-label position="floating">Boat ID</ion-label>
                <ion-input
                  v-model="manualBoatId"
                  type="text"
                  placeholder="Enter your boat's ID"
                  :disabled="isPairing"
                  @keyup.enter="handleManualPair"
                ></ion-input>
              </ion-item>

              <ion-button 
                expand="block" 
                @click="handleManualPair"
                :disabled="!manualBoatId.trim() || isPairing"
                class="ion-margin-vertical"
                size="default"
                style="--padding-top: 16px; --padding-bottom: 16px;"
              >
                <ion-spinner v-if="isPairing" name="crescent" class="ion-margin-end"></ion-spinner>
                {{ isPairing ? 'Connecting...' : 'Connect' }}
              </ion-button>

              <ion-text color="medium" class="ion-text-center">
                <p>Don't know your Boat ID? Connect to your boat's WiFi and try again.</p>
              </ion-text>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { checkmarkCircle, warning } from 'ionicons/icons';
import { 
  IonPage, 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent, 
  IonInput, 
  IonButton, 
  IonSpinner, 
  IonIcon,
  toastController,
  IonImg,
  IonLabel,
  IonItem,
  IonItemDivider,
  IonText,
  IonList,
} from '@ionic/vue';
import { useBoatConnectionStore } from '../../stores/boatConnection';

// Type definition for the boat store
interface BoatConnectionStore {
  boatId: string | null;
  initializeConnection: () => Promise<void>;
  resetConnection: () => void;
  pairWithBoat: (id: string) => Promise<void>;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}

const router = useRouter();
const boatStore = useBoatConnectionStore() as unknown as BoatConnectionStore;

// Component state
const manualBoatId = ref('');
const isPairing = ref(false);
const error = ref<string | null>(null);
const isLoading = ref(true);
const isConnecting = ref(false);
const connectionTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const statusCheckInterval = ref<ReturnType<typeof setInterval> | null>(null);

// Computed
const isAlreadyPaired = computed(() => !!boatStore.boatId);

// Cleanup on component unmount
onBeforeUnmount(() => {
  if (connectionTimeout.value) {
    clearTimeout(connectionTimeout.value);
    connectionTimeout.value = null;
  }
  if (statusCheckInterval.value) {
    clearInterval(statusCheckInterval.value);
    statusCheckInterval.value = null;
  }
});

/**
 * Handle successful connection
 */
const handleConnectionSuccess = async () => {
  // Clear any pending timeouts
  if (connectionTimeout.value) {
    clearTimeout(connectionTimeout.value);
    connectionTimeout.value = null;
  }
  
  isLoading.value = false;
  isConnecting.value = false;
  
  // Show success message
  await showToast('Connected to boat!', 'success');
  
  // Small delay to ensure the toast is visible
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Navigate to home
  router.push('/home');
};

/**
 * Handle connection errors
 */
const handleConnectionError = (errorMessage: string) => {
  if (connectionTimeout.value) {
    clearTimeout(connectionTimeout.value);
    connectionTimeout.value = null;
  }
  
  isLoading.value = false;
  isConnecting.value = false;
  error.value = errorMessage || 'Connection failed. Please try again.';
  showToast(error.value);
};

// Watch for connection status changes
watch(() => boatStore.connectionStatus, async (newStatus) => {
  if (newStatus === 'connected') {
    await handleConnectionSuccess();
  } else if (newStatus === 'error') {
    handleConnectionError(boatStore.error || 'Connection failed');
  }
});

/**
 * Initialize the component
 */
onMounted(async () => {
  if (isAlreadyPaired.value) {
    await handleAlreadyPaired();
  } else {
    try {
      isLoading.value = true;
      await boatStore.initializeConnection();
      if (boatStore.connectionStatus === 'connected') {
        await handleConnectionSuccess();
      }
    } catch (err) {
      handleConnectionError('Could not connect to boat. Make sure you are on the boat network or enter your Boat ID manually.');
      console.error('Initial connection error:', err);
    } finally {
      if (boatStore.connectionStatus !== 'connected') {
        isLoading.value = false;
      }
    }
  }
});

/**
 * Retry the connection
 */
async function retryConnection() {
  error.value = null;
  isLoading.value = true;
  
  try {
    await boatStore.initializeConnection();
  } catch (err) {
    handleConnectionError('Still unable to connect. Please check your connection or enter your Boat ID manually.');
    console.error('Connection error:', err);
  }
}

/**
 * Reset the current pairing
 */
async function resetPairing() {
  try {
    isLoading.value = true;
    boatStore.resetConnection();
    manualBoatId.value = '';
    await showToast('Pairing reset. Please connect to a boat.');
  } catch (err) {
    console.error('Error resetting pairing:', err);
    showToast('Failed to reset pairing');
  } finally {
    isLoading.value = false;
  }
}

/**
 * Handle already paired case
 */
async function handleAlreadyPaired() {
  // Don't proceed if already connecting or connected
  if (isConnecting.value) {
    console.debug('Connection attempt already in progress');
    return;
  }
  
  // Reset state
  isConnecting.value = true;
  isLoading.value = true;
  error.value = null;
  
  // Clear any existing timeout
  if (connectionTimeout.value) {
    clearTimeout(connectionTimeout.value);
    connectionTimeout.value = null;
  }
  
  // Set connection timeout
  connectionTimeout.value = setTimeout(() => {
    if (boatStore.connectionStatus !== 'connected') {
      handleConnectionError('Connection timed out. Please check your internet connection.');
    }
  }, 15000); // 15 seconds timeout
  
  try {
    await boatStore.initializeConnection();
  } catch (err) {
    handleConnectionError('Failed to initialize connection. Please try again.');
    console.error('Connection error:', err);
  }
}

/**
 * Show a toast message
 */
async function showToast(message: string, color: 'success' | 'danger' = 'danger') {
  const toast = await toastController.create({
    message,
    duration: 3000,
    color,
    position: 'bottom',
    buttons: [{ icon: 'close', role: 'cancel' }]
  });
  await toast.present();
}

/**
 * Handle manual boat pairing
 */
async function handleManualPair() {
  const boatId = manualBoatId.value.trim();
  if (!boatId) {
    showToast('Please enter a valid Boat ID');
    return;
  }
  
  if (isPairing.value) {
    return; // Prevent multiple clicks
  }

  isPairing.value = true;
  error.value = null;

  try {
    await boatStore.pairWithBoat(boatId);
    // The status watcher will handle navigation on success
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to connect with provided Boat ID';
    handleConnectionError(errorMessage);
    console.error('Pairing error:', err);
  } finally {
    isPairing.value = false;
  }
}
</script>
