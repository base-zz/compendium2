// smartConnectionManager.js
// Seamless hot-swapping connection manager for direct/relay
import { stateUpdateProvider } from './stateUpdateProvider.js';

const CHECK_INTERVAL_MS = 60000; // Check connection status once per minute instead of every 15s
const DIRECT_WS_URL = import.meta.env.VITE_LOCAL_SERVER_WS_URL || 'ws://127.0.0.1:3009/';
const NOTIFICATION_DURATION = 3000; // Show connection mode notification for 15 seconds

// We'll store the active WebSocket connection here when established
let activeConnection = null;
let currentMode = null;
let notificationElement = null;
let notificationTimeout = null;

function handleMessage(event) {
  try {
    stateUpdateProvider._notify(JSON.parse(event.data));
  } catch {
    // Silently handle errors
  }
}

async function tryDirectConnection() {
  // If we already have an active connection that's open, use it
  if (activeConnection?.readyState === WebSocket.OPEN) {
    console.log('[SMART-CONN] Using existing open connection');
    return true;
  }
  
  // If we have an active connection that's connecting, wait for it
  if (activeConnection?.readyState === WebSocket.CONNECTING) {
    console.log('[SMART-CONN] Connection in progress, waiting...');
    return new Promise((resolve) => {
      const onOpen = () => {
        activeConnection.removeEventListener('open', onOpen);
        activeConnection.removeEventListener('error', onError);
        resolve(true);
      };
      
      const onError = () => {
        activeConnection.removeEventListener('open', onOpen);
        activeConnection.removeEventListener('error', onError);
        resolve(false);
      };
      
      activeConnection.addEventListener('open', onOpen);
      activeConnection.addEventListener('error', onError);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        activeConnection.removeEventListener('open', onOpen);
        activeConnection.removeEventListener('error', onError);
        resolve(false);
      }, 2000);
    });
  }
  
  // Otherwise, create a new connection
  console.log('[SMART-CONN] Creating new connection');
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(DIRECT_WS_URL);
      activeConnection = ws; // Set as active immediately to prevent multiple attempts
      
      ws.onopen = () => {
        console.log('[SMART-CONN] New connection opened successfully');
        ws.onmessage = handleMessage;
        resolve(true);
      };
      
      ws.onerror = (err) => {
        console.log('[SMART-CONN] Connection error:', err);
        if (activeConnection === ws) activeConnection = null;
        resolve(false);
      };
      
      ws.onclose = () => {
        console.log('[SMART-CONN] Connection closed');
        if (activeConnection === ws) activeConnection = null;
      };
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('[SMART-CONN] Connection timeout');
          ws.close();
          if (activeConnection === ws) activeConnection = null;
          resolve(false);
        }
      }, 2000);
    } catch (err) {
      console.error('[SMART-CONN] Error creating connection:', err);
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
  // Clear any existing notification
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
  
  if (notificationElement) {
    document.body.removeChild(notificationElement);
    notificationElement = null;
  }
  
  // Create a new notification element
  notificationElement = document.createElement('div');
  notificationElement.className = 'connection-mode-notification';
  
  // Set the appropriate text and style based on the mode
  if (mode === 'direct') {
    notificationElement.textContent = 'Acquired Direct Connection';
    notificationElement.classList.add('direct-mode');
  } else {
    notificationElement.textContent = 'Acquired Remote Connection';
    notificationElement.classList.add('relay-mode');
  }
  
  // Add the notification to the DOM
  document.body.appendChild(notificationElement);
  
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
  }
  
  // Set a timeout to remove the notification
  notificationTimeout = setTimeout(() => {
    if (notificationElement && notificationElement.parentNode) {
      // Fade out
      notificationElement.style.opacity = '0';
      setTimeout(() => {
        if (notificationElement && notificationElement.parentNode) {
          document.body.removeChild(notificationElement);
          notificationElement = null;
        }
      }, 500); // Remove after fade out
    }
    notificationTimeout = null;
  }, NOTIFICATION_DURATION);
}

async function autoSwitchConnection() {
  // Check if we can establish a direct connection
  const canDirect = await tryDirectConnection();
  
  // Only switch if the mode is actually changing
  if (canDirect && currentMode !== 'direct') {
    console.log('[SMART-CONN] Switching to direct mode');
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
    console.log('[SMART-CONN] Switching to relay mode');
    stateUpdateProvider.switchSource('relay');
    currentMode = 'relay';
    
    // Show notification for relay mode
    showConnectionNotification('relay');
  }
}

export function startSmartConnectionManager() {
  autoSwitchConnection();
  setInterval(autoSwitchConnection, CHECK_INTERVAL_MS);
}
