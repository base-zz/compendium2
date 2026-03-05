// Direct connection Pinia sync utilities
import { useStateDataStore } from '../stores/stateDataStore'
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
  logger.info('Setting up stateUpdateProvider listeners');

  const store = useStateDataStore();

  // Single source of truth: stateUpdateProvider emits from the currently selected source
  // (direct preferred by SmartConnectionManager, relay as fallback).
  stateUpdateProvider.subscribe((evt) => {
    logger.debug('[PINIA-SYNC] stateUpdateProvider event received:', evt.type);
    if (evt.type === 'state:full-update' && evt.data) {
      logger.debug('[PINIA-SYNC] Applying full state update from stateUpdateProvider');
      store.replaceState(evt.data);
    } else if (evt.type === 'state:patch' && evt.data) {
      logger.debug('[PINIA-SYNC] Applying patch from stateUpdateProvider with', evt.data.length, 'operations');
      store.applyStatePatch(evt.data);
    } else if (evt.type === 'tide-update' && evt.data) {
      store.updateTideData(evt.data);
    } else if (evt.type === 'weather-update' && evt.data) {
      store.updateForecastData(evt.data);
    }
  });
  
  logger.info('StateUpdateProvider listener set up successfully');
}
