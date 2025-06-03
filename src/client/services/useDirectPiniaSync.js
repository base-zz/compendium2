// src/client/services/useDirectPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { directConnectionAdapter } from './directConnectionAdapter'
import { stateUpdateProvider } from './stateUpdateProvider'
import { createLogger } from './logger';

const logger = createLogger('pinia-sync');

let subscribed = false

export function useDirectPiniaSync() {
  logger.info('Initializing Pinia sync');
  if (subscribed) {
    logger.info('Already subscribed, skipping initialization');
    return; // Prevent duplicate subscriptions
  }
  
  subscribed = true;
  logger.info('Setting up event listeners');

  const store = useStateDataStore();
  
  // Listen for direct adapter events
  logger.info('Setting up directConnectionAdapter listeners');
  
  // Listen for full state updates
  directConnectionAdapter.on('state:full-update', (msg) => {
    // console.log('[PINIA-SYNC] state:full-update event received', msg);
    if (msg && msg.data) {
      // console.log('[PINIA-SYNC] Applying full state update to store');
      store.replaceState(msg.data);
    } else {
      logger.warn('Invalid full state update received', { msg });
    }
  });
  
  // Listen for patch updates
  directConnectionAdapter.on('state:patch', (msg) => {
    // console.log('[PINIA-SYNC] state:patch event received', msg);
    if (msg && msg.data) {
      // console.log('[PINIA-SYNC] Applying patch to store with', msg.data.length, 'operations');
      store.applyStatePatch(msg.data);
    } else {
      logger.warn('Invalid patch update received', { msg });
    }
  });
  
  // Keep the original listener for backward compatibility
  directConnectionAdapter.on('state-update', ({ type, data }) => {
    // console.log('[PINIA-SYNC] state-update event received', { type, data });
    if (type === 'state:full-update' && data) {
      console.log('[PINIA-SYNC] Applying full state update from state-update event', data);

      store.replaceState(data);
    } else if (type === 'state:patch' && data) {
      // console.log('[PINIA-SYNC] Applying patch from state-update event with', data.length, 'operations');
      store.applyStatePatch(data);
    } else {
      logger.warn('Unknown or invalid state-update event', { type, data });
    }
  });

  directConnectionAdapter.on('tide-update', (data) => {
    console.log("--------============ tidal data");
    const store = useStateDataStore();
    store.updateTideData(data);
  });
  
  directConnectionAdapter.on('weather-update', (data) => {
    const store = useStateDataStore();
    store.updateForecastData(data);
  });
  
  // Also listen to the stateUpdateProvider directly as a fallback
  stateUpdateProvider.subscribe((evt) => {
    // console.log('[PINIA-SYNC] stateUpdateProvider event received:', evt.type);
    if (evt.type === 'state:full-update' && evt.data) {
      // console.log('[PINIA-SYNC] Applying full state update from stateUpdateProvider');
      store.replaceState(evt.data);
    } else if (evt.type === 'state:patch' && evt.data) {
      // console.log('[PINIA-SYNC] Applying patch from stateUpdateProvider with', evt.data.length, 'operations');
      store.applyStatePatch(evt.data);
    }
  });
  
  logger.info('All event listeners set up successfully');
}
