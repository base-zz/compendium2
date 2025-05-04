// smartConnectionManager.js
// Seamless hot-swapping connection manager for direct/relay
import { stateUpdateProvider } from './stateUpdateProvider.js';

const CHECK_INTERVAL_MS = 15000; // Retry direct every 15s if on relay
const DIRECT_WS_URL = import.meta.env.VITE_LOCAL_SERVER_WS_URL || 'ws://127.0.0.1:3009/';

// We'll store the active WebSocket connection here when established
let activeConnection = null;
let currentMode = null;

function handleMessage(event) {
  try {
    stateUpdateProvider._notify(JSON.parse(event.data));
  } catch {
    // Silently handle errors
  }
}

async function tryDirectConnection() {
  if (activeConnection?.readyState === WebSocket.OPEN) return true;
  
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(DIRECT_WS_URL);
      
      ws.onopen = () => {
        activeConnection = ws;
        activeConnection.onmessage = handleMessage;
        resolve(true);
      };
      
      ws.onerror = () => resolve(false);
      
      ws.onclose = () => {
        if (activeConnection === ws) activeConnection = null;
      };
      
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);
    } catch {
      resolve(false);
    }
  });
}

async function autoSwitchConnection() {
  const canDirect = await tryDirectConnection();
  
  if (canDirect && currentMode !== 'direct') {
    stateUpdateProvider.switchSource('direct');
    currentMode = 'direct';
  } else if (!canDirect && currentMode !== 'relay') {
    stateUpdateProvider.switchSource('relay');
    currentMode = 'relay';
  }
}

export function startSmartConnectionManager() {
  autoSwitchConnection();
  setInterval(autoSwitchConnection, CHECK_INTERVAL_MS);
}
