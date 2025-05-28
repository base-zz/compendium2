// src/client/services/useRelayPiniaSync.js
import { useStateDataStore } from '../stores/stateDataStore'
import { relayConnectionBridge } from '../../relay/client/RelayConnectionBridge'
import { createLogger } from './logger';

const logger = createLogger('pinia-relay-sync');

let subscribed = false


export function useRelayPiniaSync() {
  logger.info('Initializing Relay Pinia sync');
  
  if (subscribed) {
    logger.info('Already subscribed to relay updates, skipping initialization');
    return; // Prevent duplicate subscriptions
  }
  
  subscribed = true;
  logger.info('Setting up relay event listeners');

  const store = useStateDataStore();
  
  relayConnectionBridge.on('state-update', ({ type, data }) => {
    logger.debug('Received state update from relay', { type, hasData: Boolean(data) });
    if (type === 'state:full-update') {
      store.replaceState(data);
    } else if (type === 'state:patch') {
      store.applyStatePatch(data);
    } else {
      logger.warn('Received unknown state update type from relay', { type });
    }
  });
  
  logger.info('Relay Pinia sync initialized successfully');
}
