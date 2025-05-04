// src/client/services/useDirectPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { directConnectionAdapter } from './directConnectionAdapter'
import { stateUpdateProvider } from './stateUpdateProvider'

let subscribed = false

export function useDirectPiniaSync() {
  console.log('[PINIA-SYNC] useDirectPiniaSync initialized');
  if (subscribed) {
    console.log('[PINIA-SYNC] Already subscribed, skipping initialization');
    return; // Prevent duplicate subscriptions
  }
  
  subscribed = true;
  console.log('[PINIA-SYNC] Setting up event listeners');

  const store = useStateDataStore();
  
  // Listen for direct adapter events
  console.log('[PINIA-SYNC] Setting up directConnectionAdapter listeners');
  
  // Listen for full state updates
  directConnectionAdapter.on('state:full-update', (msg) => {
    console.log('[PINIA-SYNC] state:full-update event received', msg);
    if (msg && msg.data) {
      console.log('[PINIA-SYNC] Applying full state update to store');
      store.replaceState(msg.data);
    } else {
      console.warn('[PINIA-SYNC] Invalid full state update received:', msg);
    }
  });
  
  // Listen for patch updates
  directConnectionAdapter.on('state:patch', (msg) => {
    console.log('[PINIA-SYNC] state:patch event received', msg);
    if (msg && msg.data) {
      console.log('[PINIA-SYNC] Applying patch to store with', msg.data.length, 'operations');
      store.applyStatePatch(msg.data);
    } else {
      console.warn('[PINIA-SYNC] Invalid patch update received:', msg);
    }
  });
  
  // Keep the original listener for backward compatibility
  directConnectionAdapter.on('state-update', ({ type, data }) => {
    console.log('[PINIA-SYNC] state-update event received', { type, data });
    if (type === 'state:full-update' && data) {
      console.log('[PINIA-SYNC] Applying full state update from state-update event');
      store.replaceState(data);
    } else if (type === 'state:patch' && data) {
      console.log('[PINIA-SYNC] Applying patch from state-update event with', data.length, 'operations');
      store.applyStatePatch(data);
    } else {
      console.warn('[PINIA-SYNC] Unknown or invalid state-update event:', { type, data });
    }
  });
  
  // Also listen to the stateUpdateProvider directly as a fallback
  stateUpdateProvider.subscribe((evt) => {
    console.log('[PINIA-SYNC] stateUpdateProvider event received:', evt.type);
    if (evt.type === 'state:full-update' && evt.data) {
      console.log('[PINIA-SYNC] Applying full state update from stateUpdateProvider');
      store.replaceState(evt.data);
    } else if (evt.type === 'state:patch' && evt.data) {
      console.log('[PINIA-SYNC] Applying patch from stateUpdateProvider with', evt.data.length, 'operations');
      store.applyStatePatch(evt.data);
    }
  });
  
  console.log('[PINIA-SYNC] All event listeners set up successfully');
}
