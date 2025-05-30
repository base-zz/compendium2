import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * @typedef {'disconnected' | 'connecting' | 'connected' | 'error'} ConnectionStatus
 * @typedef {'local' | 'vps' | 'remote'} ConnectionMode

/**
 * @typedef {Object} BoatConnectionState
 * @property {string | null} boatId
 * @property {ConnectionStatus} connectionStatus
 * @property {ConnectionMode | null} connectionMode
 * @property {string | null} error
 * @property {boolean} isInitialized
 * @property {boolean} vpsConnected - Whether the VPS is connected
 * @property {boolean} directConnected - Whether the direct connection is active
 */

/**
 * @typedef {Object} BoatConnectionGetters
 * @property {() => boolean} isConnected
 * @property {() => boolean} isLocal
 * @property {() => boolean} isLoading
 */

/**
 * @typedef {Object} BoatConnectionActions
 * @property {() => Promise<void>} initializeConnection
 * @property {() => Promise<BoatInfo | null>} tryLocalConnection
 * @property {(boatId: string) => Promise<void>} registerWithVPS
 * @property {(boatId: string) => Promise<void>} connectToVPS
 * @property {(manualBoatId: string) => Promise<void>} pairWithBoat
 * @property {() => void} resetConnection
 * @property {(connected: boolean) => void} updateVpsConnectionStatus
 * @property {(connected: boolean) => void} updateDirectConnectionStatus
 */

import { connectionBridge } from '../services/connectionBridge';
import { createLogger } from '../services/logger';

const logger = createLogger('boat-connection');

/**
 * @typedef {Object} BoatInfo
 * @property {string} boatId - The unique identifier for the boat
 */

/**
 * Boat connection store for managing the connection to the boat
 * @returns {Object} The boat connection store
 */
export const useBoatConnectionStore = defineStore('boatConnection', () => {
  // State
  /** @type {import('vue').Ref<string | null>} */
  const boatId = ref(localStorage.getItem('activeBoatId') || null);
  
  /** @type {import('vue').Ref<ConnectionStatus>} */
  const connectionStatus = ref('disconnected');
  
  /** @type {import('vue').Ref<ConnectionMode | null>} */
  const connectionMode = ref(null);
  
  /** @type {import('vue').Ref<string | null>} */
  const error = ref(null);
  
  /** @type {import('vue').Ref<boolean>} */
  const isInitialized = ref(false);
  
  /** @type {import('vue').Ref<boolean>} */
  const vpsConnected = ref(false);
  
  /** @type {import('vue').Ref<boolean>} */
  const directConnected = ref(false);
  
  /** @type {ReturnType<typeof setInterval> | null} */
  let healthCheckInterval = null;

  // Getters
  /** @type {import('vue').ComputedRef<boolean>} */
  const isConnected = computed(() => connectionStatus.value === 'connected');
  
  /** @type {import('vue').ComputedRef<boolean>} */
  const isLocal = computed(() => connectionMode.value === 'local');
  
  /** @type {import('vue').ComputedRef<boolean>} */
  const isLoading = computed(() => connectionStatus.value === 'connecting' && !isInitialized.value);

  // Actions
  /**
   * Initializes the boat connection
   * @returns {Promise<void>}
   */
  /**
   * Updates the VPS connection status
   * @param {boolean} connected - Whether the VPS is connected
   */
  /**
   * Checks the VPS health status
   * @returns {Promise<boolean>} True if the VPS is healthy, false otherwise
   */
  async function checkVpsHealth() {
    if (!import.meta.env.VITE_VPS_API_URL) {
      logger.debug('VPS API URL not configured, skipping health check');
      return false;
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_VPS_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Don't cache the health check
        cache: 'no-store',
      });
      
      const isHealthy = response.ok;
      logger.debug(`VPS health check ${isHealthy ? 'succeeded' : 'failed'} with status ${response.status}`);
      return isHealthy;
    } catch (/** @type {any} */ error) {
      logger.debug('VPS health check failed:', error?.message || 'Unknown error');
      return false;
    }
  }
  
  /**
   * Updates the VPS connection status based on health check
   */
  async function updateVpsConnectionStatus() {
    const isHealthy = await checkVpsHealth();
    vpsConnected.value = isHealthy;
    logger.debug(`VPS connection status updated: ${isHealthy ? 'connected' : 'disconnected'}`);
  }
  
  /**
   * Updates the direct connection status
   * @param {boolean} connected - Whether the direct connection is active
   */
  function updateDirectConnectionStatus(connected) {
    directConnected.value = connected;
    logger.debug(`Direct connection status updated: ${connected ? 'connected' : 'disconnected'}`);
  }

  async function initializeConnection() {
    if (isInitialized.value) return;
    
    // Set up direct connection status listener
    connectionBridge.on('connected', () => updateDirectConnectionStatus(true));
    connectionBridge.on('disconnected', () => updateDirectConnectionStatus(false));
    
    // Set up VPS health check
    if (import.meta.env.VITE_VPS_API_URL) {
      // Initial check
      await updateVpsConnectionStatus();
      
      // Set up periodic checks (every 30 seconds)
      healthCheckInterval = setInterval(updateVpsConnectionStatus, 30000);
    }
    
    connectionStatus.value = 'connecting';
    error.value = null;
    
    try {
      // Try local connection first
      const localBoatInfo = await tryLocalConnection();
      
      if (localBoatInfo) {
        logger.debug('Local boat found:', localBoatInfo);
        connectionMode.value = 'local';
        boatId.value = localBoatInfo.boatId;
        localStorage.setItem('activeBoatId', boatId.value);
        await registerWithVPS(boatId.value);
      } else if (boatId.value) {
        // Fall back to remote connection if we have a boat ID
        logger.debug('Using existing boat ID for remote connection:', boatId.value);
        connectionMode.value = 'remote';
        await connectToVPS(boatId.value);
      } else {
        throw new Error('No boat paired and no local boat found');
      }
      
      connectionStatus.value = 'connected';
      isInitialized.value = true;
      logger.info(`Connected to boat ${boatId.value} in ${connectionMode.value} mode`);
    } catch (err) {
      connectionStatus.value = 'error';
      error.value = err.message;
      logger.error('Connection failed:', err);
      throw err;
    }
  }

  /**
   * Attempts to connect to the local boat server
   * @returns {Promise<BoatInfo | null>}
   */
  async function tryLocalConnection() {
    try {
      const response = await fetch('http://compendium.local:3001/api/boat-info', {
        signal: AbortSignal.timeout(2000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      logger.debug('Local connection attempt failed:', err.message);
      return null;
    }
  }

  /**
   * Registers the boat with the VPS
   * @param {string} boatId - The boat ID to register
   * @returns {Promise<void>}
   */
  async function registerWithVPS(boatId) {
    // Skip VPS registration if we're in development or the VPS URL is not set
    if (import.meta.env.DEV || !import.meta.env.VITE_VPS_API_URL) {
      logger.debug('Skipping VPS registration in development or missing VPS URL');
      return;
    }
    
    try {
      const vpsUrl = `${import.meta.env.VITE_VPS_API_URL}/api/boats/register`;
      logger.debug('Registering with VPS at:', vpsUrl);
      
      const response = await fetch(vpsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boatId })
      });
      
      if (!response.ok) {
        throw new Error(`VPS registration failed with status: ${response.status}`);
      }
      
      logger.debug('Successfully registered with VPS');
    } catch (err) {
      // Only log as debug to avoid cluttering the console in development
      logger.debug('VPS registration failed (may be offline or not configured):', err.message);
      // Continue anyway - this is non-critical
    }
  }

  /**
   * Connects to the VPS with the given boat ID
   * @param {string} boatId - The boat ID to connect with
   * @returns {Promise<void>}
   */
  async function connectToVPS(boatId) {
    try {
      await connectionBridge.connect(boatId);
      logger.debug('Connected to VPS successfully');
    } catch (err) {
      logger.error('Failed to connect to VPS:', err);
      throw new Error('Could not connect to boat. Please check your internet connection.');
    }
  }

  /**
   * Pairs with a boat using a manual boat ID
   * @param {string} manualBoatId - The boat ID to pair with
   * @returns {Promise<void>}
   */
  async function pairWithBoat(manualBoatId) {
    if (!manualBoatId?.trim()) {
      throw new Error('Please enter a valid Boat ID');
    }
    
    try {
      connectionStatus.value = 'connecting';
      boatId.value = manualBoatId.trim();
      localStorage.setItem('activeBoatId', boatId.value);
      
      // Try connecting with the provided ID
      connectionMode.value = 'remote';
      await connectToVPS(boatId.value);
      
      connectionStatus.value = 'connected';
      isInitialized.value = true;
      logger.info(`Connected to boat ${boatId.value} in remote mode`);
    } catch (/** @type {any} */ err) {
      connectionStatus.value = 'error';
      error.value = err?.message || 'Unknown error during pairing';
      logger.error('Manual pairing failed:', err);
      throw err;
    }
  }

  /**
   * Resets the connection state
   * @returns {void}
   */
  function resetConnection() {
    boatId.value = null;
    connectionStatus.value = 'disconnected';
    connectionMode.value = null;
    error.value = null;
    isInitialized.value = false;
    localStorage.removeItem('activeBoatId');
    
    // Clear health check interval
    if (healthCheckInterval !== null) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
  }

  return {
    // State
    boatId,
    connectionStatus,
    vpsConnected,
    directConnected,
    connectionMode,
    error,
    isInitialized,
    
    // Getters
    isConnected,
    isLocal,
    isLoading,
    
    // Actions
    initializeConnection,
    pairWithBoat,
    resetConnection,
    updateVpsConnectionStatus,
    updateDirectConnectionStatus
  };
});


