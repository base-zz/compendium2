// smartConnectionManager.js
// Seamless hot-swapping connection manager for direct/relay
import { stateUpdateProvider } from './stateUpdateProvider.js';
import { useDirectPiniaSync } from './useDirectPiniaSync.js';
import { useRelayPiniaSync } from './useRelayPiniaSync.js';

const CHECK_INTERVAL_MS = 15000; // Retry direct every 15s if on relay
const DIRECT_WS_URL = import.meta.env.VITE_LOCAL_SERVER_WS_URL || 'ws://127.0.0.1:3002/';

console.log('[SmartConn] Creating SmartConnectionManager or DirectConnectionAdapter');

let currentMode = null;
let intervalId = null;

function showConnectionStatus(mode) {
  const msg = `[SmartConn] Switched to ${mode.toUpperCase()} connection`;
  console.log(msg);
  let el = document.getElementById('connection-status-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'connection-status-indicator';
    el.style.position = 'fixed';
    el.style.bottom = '10px';
    el.style.right = '10px';
    el.style.background = 'rgba(0,0,0,0.7)';
    el.style.color = 'white';
    el.style.padding = '8px 14px';
    el.style.borderRadius = '8px';
    el.style.zIndex = 9999;
    el.style.fontSize = '1em';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  // Remove the element after 15 seconds
  setTimeout(() => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }, 15000);
}

async function tryDirectConnection() {
  console.log(`[SmartConn] Trying direct connection to ${DIRECT_WS_URL}...`);
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new window.WebSocket(DIRECT_WS_URL);
    ws.onopen = () => {
      console.log('[SmartConn] Direct connection succeeded.');
      ws.close();
      if (!settled) {
        settled = true;
        resolve(true);
      }
    };
    ws.onerror = (e) => {
      console.warn('[SmartConn] Direct connection failed:', e);
      if (!settled) {
        settled = true;
        resolve(false);
      }
    };
    setTimeout(() => {
      if (!settled) {
        console.warn('[SmartConn] Direct connection timed out.');
        ws.close();
        settled = true;
        resolve(false);
      }
    }, 2000);
  });
}

async function autoSwitchConnection() {
  console.log('[SmartConn] Auto-switching connection...');
  const canDirect = await tryDirectConnection();
  console.log('[SmartConn] Direct connection check result:', canDirect);
  if (canDirect && currentMode !== 'direct') {
    console.log('[SmartConn] Switching to direct connection');
    useDirectPiniaSync(); // Ensure Pinia sync is initialized for direct connection
    stateUpdateProvider.switchSource('direct');
    console.log('[SmartConn] Switched to direct connection');
    currentMode = 'direct';
    showConnectionStatus('direct');
    // Stop further checks if direct connection is successful
    if (intervalId) {
      console.log('[SmartConn] Stopping interval checks');
      clearInterval(intervalId);
      intervalId = null;
    }
  } else if (!canDirect && currentMode !== 'relay') {
    console.log('[SmartConn] Switching to relay connection');
    useRelayPiniaSync(); // Ensure Pinia sync is initialized for relay connection
    stateUpdateProvider.switchSource('relay');
    console.log('[SmartConn] Switched to relay connection');
    currentMode = 'relay';
    showConnectionStatus('relay');
    // If desired, keep interval running to retry direct connection
  }
}

export function startSmartConnectionManager() {
  autoSwitchConnection();
  if (intervalId) clearInterval(intervalId);
  intervalId = setInterval(autoSwitchConnection, CHECK_INTERVAL_MS);
}
