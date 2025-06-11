// smartConnectionManager.js
// Seamless hot-swapping connection manager for direct/relay
import { stateUpdateProvider } from './stateUpdateProvider.js';
import { createLogger } from './logger.js';
import { directConnectionAdapter } from './directConnectionAdapter.js';

const logger = createLogger('smart-connection');

// Configuration
const CHECK_INTERVAL_MS = 60000; // Check connection status once per minute
const NOTIFICATION_DURATION = 3000; // Show connection mode notification for 3 seconds

// Get the appropriate WebSocket URL based on environment - same logic as DirectConnectionAdapter
const getWebSocketUrl = () => {
  // In development or if explicitly set in .env.local
  if (import.meta.env.VITE_DIRECT_WS_URL) {
    return import.meta.env.VITE_DIRECT_WS_URL;
  }
  
  // For production (mobile app), use the current hostname with the standard port
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = 3009; // Standard port for direct WebSocket server
  
  return `${protocol}//${host}:${port}`;
};

// Use the same URL determination logic as DirectConnectionAdapter
const DIRECT_WS_URL = getWebSocketUrl();

// Track the current connection mode
let currentMode = null;
let notificationElement = null;
let notificationTimeout = null;

// Helper function to get platform information for debugging
function getPlatformInfo() {
  const userAgent = navigator.userAgent;
  const platform = {
    isIOS: /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream,
    isMacOS: /Mac/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isCapacitor: window?.Capacitor?.isNativePlatform?.() || false,
    userAgent: userAgent
  };
  
  logger.debug('Platform info:', platform);
  
  return platform;
}


// Test DNS resolution for a hostname// Test DNS resolution for a hostname
async function testDnsResolution(hostname) {
  logger.debug(`Testing DNS resolution for ${hostname}`);
  
  // Extract hostname from URL if needed
  if (hostname.startsWith('ws://') || hostname.startsWith('wss://')) {
    const url = new URL(hostname);
    hostname = url.hostname;
  }
  
  // For localhost or IP addresses, just return true
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    logger.debug(`Using localhost or IP address: ${hostname}`);
    return true;
  }
  
  // For browser environment, we'll try to resolve using a more reliable method
  try {
    // This creates a URL object which will validate the hostname format
    // It will throw if the hostname is invalid
    new URL(`http://${hostname}`);
    
    // If we get here, the hostname is at least syntactically valid
    // For actual resolution, we'll assume it will work since we can't do DNS lookups in the browser
    logger.debug(`Hostname ${hostname} is syntactically valid`);
    return true;
  } catch (error) {
    logger.warn(`Invalid hostname format: ${hostname}`, error);
    return false;
  }
}

// Test network connectivity to the server
async function testNetworkConnectivity() {
  try {
    logger.info('Testing network connectivity to server...');
    
    // Get required environment variables
    const host = import.meta.env.VITE_DIRECT_BOAT_HOST;
    const port = import.meta.env.VITE_DIRECT_BOAT_PORT;
    const path = import.meta.env.VITE_DIRECT_BOAT_PATH;

    if (!host || !port || !path) {
      const error = 'Required environment variables are missing: VITE_DIRECT_BOAT_HOST, VITE_DIRECT_BOAT_PORT, VITE_DIRECT_BOAT_PATH';
      logger.error(error);
      throw new Error(error);
    }

    const httpUrl = `http://${host}:${port}${path}`;
    logger.info(`Testing HTTP connectivity to: ${httpUrl}`);
    
    // First test DNS resolution
    const dnsResult = await testDnsResolution(host);
    logger.info(`DNS resolution test result for ${host}:`, dnsResult);
    
    if (!dnsResult) {
      logger.warn('DNS resolution failed, cannot test network connectivity');
      return false;
    }
    
    // Try HTTP request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    try {
      const response = await fetch(httpUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        logger.debug('HTTP connectivity test successful');
        return true;
      }
      
      logger.warn(`HTTP request failed with status ${response.status}`);
      return false;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        logger.warn('HTTP request timed out');
      } else {
        logger.warn('HTTP request failed:', error.message);
      }
      return false;
    }
  } catch (error) {
    logger.error('Error in testNetworkConnectivity:', error);
    return false;
  }
}

async function tryDirectConnection() {
  // Log current connection state
  logger.debug(`Current connection state: ${JSON.stringify(directConnectionAdapter.connectionState)}`);
  
  // If already connected, return true
  if (directConnectionAdapter.connectionState.status === 'connected') {
    logger.debug('Using existing direct connection');
    return true;
  }
  
  // If connecting, wait for the connection to complete
  if (directConnectionAdapter.ws) {
    const state = directConnectionAdapter.ws.readyState;
    logger.debug(`WebSocket readyState: ${state} (${getReadyStateName(state)})`);
    
    if (state === WebSocket.CONNECTING) {
      logger.debug('Connection in progress, waiting for it to complete...');
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Connection attempt timed out'));
          }, 10000); // 10 second timeout
          
          const onConnect = () => {
            cleanup();
            resolve();
          };
          
          const onError = (error) => {
            cleanup();
            reject(error);
          };
          
          const cleanup = () => {
            clearTimeout(timeout);
            directConnectionAdapter.removeListener('connect', onConnect);
            directConnectionAdapter.removeListener('error', onError);
          };
          
          directConnectionAdapter.once('connect', onConnect);
          directConnectionAdapter.once('error', onError);
        });
        
        logger.debug('Connection completed successfully');
        return true;
      } catch (error) {
        logger.error('Connection attempt failed:', error);
        return false;
      }
    }
  }
  
  // If not connected and not connecting, start a new connection
  logger.info('Initiating new WebSocket connection...');
  try {
    // Log the WebSocket URL that will be used
    const wsUrl = directConnectionAdapter._wsUrl || 'unknown';
    logger.info(`Connecting to WebSocket at: ${wsUrl}`);
    
    // Add error listener to capture any connection errors
    const errorListener = (error) => {
      logger.error('WebSocket connection error:', error);
    };
    directConnectionAdapter.once('error', errorListener);
    
    // Start the connection
    await directConnectionAdapter.connect();
    
    // Remove the error listener if connection was successful
    directConnectionAdapter.removeListener('error', errorListener);
    
    logger.info('Direct WebSocket connection established successfully');
    return true;
  } catch (error) {
    logger.error('Direct WebSocket connection failed:', {
      message: error.message,
      stack: error.stack,
      url: directConnectionAdapter._wsUrl || 'unknown'
    });
    return false;
  }
}

// Helper function to get WebSocket ready state name
function getReadyStateName(state) {
  switch (state) {
    case WebSocket.CONNECTING: return 'CONNECTING';
    case WebSocket.OPEN: return 'OPEN';
    case WebSocket.CLOSING: return 'CLOSING';
    case WebSocket.CLOSED: return 'CLOSED';
    default: return `UNKNOWN (${state})`;
  }
}

/**
 * Shows a connection mode notification overlay for 15 seconds
 * @param {string} mode - The connection mode ('direct' or 'relay')
 */
function showConnectionNotification(mode) {
  logger.info(`Showing ${mode} connection notification`);
  
  // Clear any existing notification
  if (notificationTimeout) {
    logger.debug('Clearing existing notification timeout');
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
  
  if (notificationElement) {
    logger.debug('Removing existing notification element');
    document.body.removeChild(notificationElement);
    notificationElement = null;
  }
  
  try {
    // Create a new notification element
    notificationElement = document.createElement('div');
    notificationElement.className = 'connection-mode-notification';
    
    // Set the appropriate text and style based on the mode
    const isDirect = mode === 'direct';
    const modeText = isDirect ? 'Direct' : 'Remote';
    notificationElement.textContent = `Acquired ${modeText} Connection`;
    notificationElement.classList.add(isDirect ? 'direct-mode' : 'relay-mode');
    
    logger.debug(`Created ${modeText} connection notification element`);
  } catch (error) {
    logger.error('Error creating notification element:', error);
    return; // Exit if we can't create the notification
  }
  
  try {
    // Add the notification to the DOM
    document.body.appendChild(notificationElement);
    logger.debug('Added notification element to DOM');
    
    // Add styles if they don't exist
    if (!document.getElementById('connection-notification-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'connection-notification-styles';
      styleElement.textContent = `
        .connection-mode-notification {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 5px;
          color: white;
          font-weight: bold;
          font-size: 12px;
          z-index: 9999;
          opacity: 0.4;
          transition: opacity 0.5s ease-in-out;
          background-color: black;
          text-align: center;
        }
        .direct-mode {
          border-left: 4px solid #4caf50; /* Green indicator */
        }
        .relay-mode {
          border-left: 4px solid #2196f3; /* Blue indicator */
        }
      `;
      document.head.appendChild(styleElement);
      logger.debug('Added notification styles to document head');
    }
  } catch (error) {
    logger.error('Error setting up notification:', error);
    return; // Exit if we can't set up the notification
  }
  
  // Set a timeout to remove the notification
  notificationTimeout = setTimeout(() => {
    try {
      if (notificationElement && notificationElement.parentNode) {
        logger.debug('Starting notification fade out');
        // Fade out
        notificationElement.style.opacity = '0';
        
        setTimeout(() => {
          try {
            if (notificationElement && notificationElement.parentNode) {
              document.body.removeChild(notificationElement);
              notificationElement = null;
              logger.debug('Removed notification element after fade out');
            }
          } catch (error) {
            logger.error('Error during notification cleanup:', error);
          }
        }, 500); // Remove after fade out
      }
    } catch (error) {
      logger.error('Error during notification fade out:', error);
    } finally {
      notificationTimeout = null;
    }
  }, NOTIFICATION_DURATION);
  
  logger.debug(`Notification will auto-dismiss in ${NOTIFICATION_DURATION/1000} seconds`);
}

// Track the last connection check time
let lastConnectionCheck = 0;

// Only run the connection check if it's been at least 30 seconds since the last check
// and the connection status might have changed
async function shouldRunConnectionCheck() {
  const now = Date.now();
  const timeSinceLastCheck = now - lastConnectionCheck;
  
  // Don't check more often than every 30 seconds
  if (timeSinceLastCheck < 30000) {
    logger.debug(`Skipping connection check - last check was ${timeSinceLastCheck}ms ago`);
    return false;
  }
  
  // If we're in direct mode and the connection is good, don't run the check
  if (directConnectionAdapter.connectionState.status === 'connected') {
    logger.debug('Skipping connection check - direct connection is healthy');
    return false;
  }
  
  return true;
}

async function autoSwitchConnection() {
  try {
    // Skip the check if we don't need to run it
    if (!await shouldRunConnectionCheck()) {
      return;
    }
    
    lastConnectionCheck = Date.now();
    logger.info('Starting connection mode check...');
    
    // Get platform info for debugging
    const platformInfo = getPlatformInfo();
    const platformName = platformInfo.isIOS ? 'iOS' : platformInfo.isAndroid ? 'Android' : 'Web';
    logger.debug(`Running on platform: ${platformName} (Capacitor: ${platformInfo.isCapacitor ? 'yes' : 'no'})`);
    
    // Test basic network connectivity first
    const isServerReachable = await testNetworkConnectivity();
    logger.debug(`Server reachable via HTTP: ${isServerReachable ? 'yes' : 'no'}`);
    
    // If server is not reachable, fall back to relay immediately
    if (!isServerReachable) {
      logger.warn('Server not reachable, falling back to relay mode');
      if (currentMode !== 'relay') {
        await stateUpdateProvider.switchSource('relay');
        currentMode = 'relay';
        showConnectionNotification('relay');
      }
      return;
    }
    
    // Check if we can establish a direct connection
    logger.debug('Testing direct WebSocket connection...');
    const canDirect = await tryDirectConnection();
    logger.info(`Direct connection test ${canDirect ? 'succeeded' : 'failed'}`);
    
    // Only switch if the mode is actually changing
    if (canDirect) {
      if (currentMode !== 'direct') {
        logger.info('Switching to direct connection mode');
        await stateUpdateProvider.switchSource('direct');
        currentMode = 'direct';
        showConnectionNotification('direct');
      } else {
        logger.debug('Already in direct mode with good connection');
      }
    } else {
      if (currentMode !== 'relay') {
        logger.warn('Falling back to relay connection mode');
        await stateUpdateProvider.switchSource('relay');
        currentMode = 'relay';
        showConnectionNotification('relay');
      } else {
        logger.debug('Staying in relay mode');
      }
    }
  } catch (error) {
    logger.error('Error in autoSwitchConnection:', error);
  } finally {
    // Schedule the next check
    setTimeout(autoSwitchConnection, CHECK_INTERVAL_MS);
  }
}

export function startSmartConnectionManager() {
  logger.info('Starting Smart Connection Manager');
  logger.debug(`Direct WebSocket URL: ${DIRECT_WS_URL}`);
  logger.info(`Check interval: ${CHECK_INTERVAL_MS}ms`);
  
  // Log platform info for debugging
  const platformInfo = getPlatformInfo();
  logger.info(`Platform: ${platformInfo.isIOS ? 'iOS' : platformInfo.isAndroid ? 'Android' : 'Web'}`);
  logger.info(`User Agent: ${platformInfo.userAgent}`);
  
  // Run initial connection check after a short delay to allow other initialization to complete
  setTimeout(() => {
    logger.debug('Running initial connection check...');
    autoSwitchConnection();
  }, 1000);
  
  logger.info('Smart Connection Manager started');
}
