// smartConnectionManager.js
// Seamless hot-swapping connection manager for direct/relay
import { stateUpdateProvider } from './stateUpdateProvider.js';
import { createLogger } from './logger.js';

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

// We'll store the active WebSocket connection here when established
let activeConnection = null;
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

// Test DNS resolution for a hostname
async function testDnsResolution(hostname) {
  logger.debug(`Testing DNS resolution for ${hostname}`);
  
  // Extract hostname from URL if needed
  if (hostname.startsWith('ws://') || hostname.startsWith('wss://')) {
    const url = new URL(hostname);
    hostname = url.hostname;
  }
  
  try {
    // Use fetch with a timeout to test if the hostname resolves
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Try to make a request to the hostname to see if DNS resolves
    logger.info(`Attempting to resolve hostname: ${hostname}`);
    const testUrl = `http://${hostname}:3009/ping`;
    
    try {
      await fetch(testUrl, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      logger.debug(`DNS resolution for ${hostname} successful`);
      return true;
    } catch (fetchError) {
      // Check if this is a network error (which means DNS resolved) or a DNS error
      if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
        logger.warn(`Network error but hostname may have resolved: ${hostname}`, fetchError);
        // This could be a network error after DNS resolution succeeded
        return 'network_error';
      } else if (fetchError.name === 'AbortError') {
        logger.warn(`Request timed out for hostname: ${hostname}`);
        return 'timeout';
      }
      
      logger.error(`DNS resolution error for ${hostname}:`, fetchError);
      return false;
    }
  } catch (error) {
    logger.error(`DNS resolution error for ${hostname}:`, error);
    return false;
  }
}

// Test network connectivity to the server
async function testNetworkConnectivity() {
  logger.info('Testing network connectivity to server...');
  logger.debug('Direct WS URL:', DIRECT_WS_URL);
  
  // First test DNS resolution
  const urlObj = new URL(DIRECT_WS_URL.replace('ws://', 'http://').replace('wss://', 'https://'));
  const hostname = urlObj.hostname;
  
  // Test DNS resolution first
  const dnsResult = await testDnsResolution(hostname);
  logger.info(`DNS resolution test result for ${hostname}:`, dnsResult);
  
  // If DNS resolution failed, no need to continue
  if (!dnsResult) {
    logger.warn('DNS resolution failed, cannot test network connectivity');
    return false;
  }
  
  // Try to establish a WebSocket connection to test connectivity
  return new Promise((resolve) => {
    logger.debug('Attempting to create test WebSocket connection');
    const testWs = new WebSocket(DIRECT_WS_URL);
    let connectionTimedOut = false;
    
    const timeoutId = setTimeout(() => {
      logger.debug('WebSocket connection test timed out');
      connectionTimedOut = true;
      testWs.close();
      resolve(false);
    }, 3000);
    
    testWs.onopen = () => {
      logger.debug('Test WebSocket connection opened successfully');
      clearTimeout(timeoutId);
      testWs.close();
      resolve(true);
    };
    
    testWs.onerror = (error) => {
      if (!connectionTimedOut) {
        clearTimeout(timeoutId);
        logger.warn('Test WebSocket connection failed', {
          url: DIRECT_WS_URL,
          error: error?.message || 'Unknown error'
        });
        resolve(false);
      }
    };
    
    testWs.onclose = () => {
      if (!connectionTimedOut) {
        clearTimeout(timeoutId);
        logger.debug('Test WebSocket connection closed');
      }
    };
  });
}

function handleMessage(event) {
  try {
    stateUpdateProvider._notify(JSON.parse(event.data));
  } catch (error) {
    logger.error('Error processing message:', error);
  }
}

async function tryDirectConnection() {
  // If we already have an active connection that's open, use it
  if (activeConnection?.readyState === WebSocket.OPEN) {
    logger.info('Using existing open WebSocket connection');
    return true;
  }
  
  // If we have an active connection that's connecting, wait for it
  if (activeConnection?.readyState === WebSocket.CONNECTING) {
    logger.info('Connection in progress, waiting for it to complete...');
    return new Promise((resolve) => {
      const onOpen = () => {
        activeConnection.removeEventListener('open', onOpen);
        activeConnection.removeEventListener('error', onError);
        logger.info('Connection completed successfully');
        resolve(true);
      };
      
      const onError = (error) => {
        activeConnection.removeEventListener('open', onOpen);
        activeConnection.removeEventListener('error', onError);
        logger.error('Error while waiting for connection:', error);
        resolve(false);
      };
      
      activeConnection.addEventListener('open', onOpen);
      activeConnection.addEventListener('error', onError);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        activeConnection.removeEventListener('open', onOpen);
        activeConnection.removeEventListener('error', onError);
        logger.warn('Connection attempt timed out after 2 seconds');
        resolve(false);
      }, 2000);
    });
  }
  
  // Otherwise, create a new connection
  logger.info('Creating new WebSocket connection to:', DIRECT_WS_URL);
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(DIRECT_WS_URL);
      activeConnection = ws; // Set as active immediately to prevent multiple attempts
      
      ws.onopen = () => {
        logger.info('WebSocket connection established successfully');
        ws.onmessage = handleMessage;
        resolve(true);
      };
      
      ws.onerror = (err) => {
        const platformInfo = getPlatformInfo();
        logger.error('WebSocket connection error', {
          url: DIRECT_WS_URL,
          errorType: err.type,
          errorMessage: err.message || 'No message',
          platform: platformInfo.isIOS ? 'iOS' : platformInfo.isAndroid ? 'Android' : 'Other',
          capacitor: platformInfo.isCapacitor,
          readyState: ws.readyState
        });
        if (activeConnection === ws) activeConnection = null;
        resolve(false);
      };
      
      ws.onclose = (event) => {
        logger.info(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
        if (activeConnection === ws) activeConnection = null;
      };
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          logger.warn('WebSocket connection attempt timed out after 2 seconds');
          ws.close();
          if (activeConnection === ws) activeConnection = null;
          resolve(false);
        }
      }, 2000);
    } catch (err) {
      logger.error('Error creating WebSocket connection:', err);
      activeConnection = null;
      resolve(false);
    }
  });
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

async function autoSwitchConnection() {
  logger.info('Starting connection mode check...');
  
  // Get platform info for debugging
  const platformInfo = getPlatformInfo();
  const platformName = platformInfo.isIOS ? 'iOS' : platformInfo.isAndroid ? 'Android' : 'Web';
  logger.info(`Running on platform: ${platformName} (Capacitor: ${platformInfo.isCapacitor ? 'yes' : 'no'})`);
  
  // Test basic network connectivity first
  const isServerReachable = await testNetworkConnectivity();
  logger.info(`Server reachable via HTTP: ${isServerReachable ? 'yes' : 'no'}`);
  
  // Check if we can establish a direct connection
  logger.info('Attempting direct WebSocket connection...');
  const canDirect = await tryDirectConnection();
  logger.info(`Direct connection ${canDirect ? 'succeeded' : 'failed'}`);
  
  // Only switch if the mode is actually changing
  if (canDirect && currentMode !== 'direct') {
    logger.info('Switching to direct connection mode');
    // Use the existing connection when switching to direct mode
    if (activeConnection && activeConnection.readyState === WebSocket.OPEN) {
      stateUpdateProvider.switchSourceWithConnection('direct', activeConnection);
    } else {
      stateUpdateProvider.switchSource('direct');
    }
    currentMode = 'direct';
    
    // Show notification for direct mode
    showConnectionNotification('direct');
  } else if (!canDirect && currentMode !== 'relay') {
    logger.warn('Falling back to relay connection mode');
    stateUpdateProvider.switchSource('relay');
    currentMode = 'relay';
    
    // Show notification for relay mode
    showConnectionNotification('relay');
  } else {
    logger.info(`Staying in ${currentMode} mode`);
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
  
  // Run initial connection check
  autoSwitchConnection();
  
  // Set up periodic connection checks
  setInterval(() => {
    logger.debug('Running scheduled connection check...');
    autoSwitchConnection();
  }, CHECK_INTERVAL_MS);
  
  logger.info('Smart Connection Manager started');
}
