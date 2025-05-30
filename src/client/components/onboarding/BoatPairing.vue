<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
    <div class="w-full max-w-md bg-white rounded-lg shadow-md p-8 space-y-6">
      <!-- App Logo/Header -->
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isAlreadyPaired ? 'Already Paired' : 'Connect to Your Boat' }}
        </h1>
        <p v-if="isAlreadyPaired" class="mt-2 text-sm text-gray-600">
          You're already paired with boat ID: 
          <span class="font-mono font-bold">{{ boatStore.boatId }}</span>
        </p>
        <p v-else class="mt-2 text-sm text-gray-600">
          Get started by connecting to your boat's network
        </p>
      </div>

      <!-- Already Paired State -->
      <div v-if="isAlreadyPaired" class="text-center py-8">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-50 mb-4">
          <IonIcon :icon="checkmarkCircle" class="h-10 w-10 text-green-500" />
        </div>
        <p class="text-gray-700 mb-6">
          You're all set! You can now control your boat.
        </p>

        <button
          @click="resetPairing"
          class="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Pair with a different boat
        </button>
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p class="text-gray-700">Searching for local boat...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>
        </div>
        <div class="mt-4">
          <button
            @click="retryConnection"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Manual Pairing Form -->
      <div v-else class="space-y-4">
        <div class="relative">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-gray-300"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 bg-white text-gray-500">
              Or connect manually
            </span>
          </div>
        </div>

        <div class="mt-6">
          <label for="boatId" class="block text-sm font-medium text-gray-700">Boat ID</label>
          <div class="mt-1 flex rounded-md shadow-sm">
            <input
              v-model="manualBoatId"
              type="text"
              id="boatId"
              class="focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md border-gray-300"
              placeholder="Enter your boat's ID"
              :disabled="isPairing"
            />
          </div>
        </div>

        <div>
          <button
            @click="handleManualPair"
            :disabled="!manualBoatId.trim() || isPairing"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isPairing">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
            <span v-else>Connect</span>
          </button>
        </div>

        <div class="mt-4 text-center text-sm text-gray-500">
          <p>Don't know your Boat ID? Connect to your boat's WiFi and try again.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { checkmarkCircle } from 'ionicons/icons';
import { IonIcon } from '@ionic/vue';
import { useBoatConnectionStore } from '../../stores/boatConnection';

// Type definition for the boat store
interface BoatConnectionStore {
  boatId: string | null;
  initializeConnection: () => Promise<void>;
  resetConnection: () => void;
  pairWithBoat: (id: string) => Promise<void>;
}

const router = useRouter();
const boatStore = useBoatConnectionStore() as unknown as BoatConnectionStore;

const manualBoatId = ref('');
const isPairing = ref(false);
const error = ref<string | null>(null);
const isLoading = ref(true);

const isAlreadyPaired = computed(() => !!boatStore.boatId);

onMounted(async () => {
  try {
    await boatStore.initializeConnection();
  } catch (err) {
    error.value = 'Could not connect to boat. Make sure you are on the boat network or enter your Boat ID manually.';
  } finally {
    isLoading.value = false;
  }
});

async function retryConnection() {
  error.value = null;
  try {
    await boatStore.initializeConnection();
    router.push('/dashboard');
  } catch (err) {
    error.value = 'Still unable to connect. Please check your connection or enter your Boat ID manually.';
    console.error('Connection error:', err);
  }
}

function resetPairing() {
  boatStore.resetConnection();
  // Clear the manual boat ID if it was just entered
  manualBoatId.value = '';
}

async function handleManualPair() {
  if (!manualBoatId.value.trim()) return;
  
  isPairing.value = true;
  error.value = null;
  
  try {
    await boatStore.pairWithBoat(manualBoatId.value);
    router.push('/dashboard');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to connect with provided Boat ID';
    error.value = errorMessage;
    console.error('Pairing error:', err);
  } finally {
    isPairing.value = false;
  }
}
</script>
