// Relay Pinia sync utilities
import { useStateDataStore } from '../stores/stateDataStore'
import { relayConnectionBridge } from '@/relay/client/RelayConnectionBridge.js'
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

  // Get the Pinia store instance
  const store = useStateDataStore();
  
  // Setup state update handler
  const handleStateUpdate = ({ type, data }) => {
    try {
      logger.debug('Received state update from relay', { type, hasData: Boolean(data) });
      if (type === 'state:full-update') {
        store.replaceState(data);
      } else if (type === 'state:patch') {
        store.applyStatePatch(data);
      } else {
        logger.warn('Received unknown state update type from relay', { type });
      }
    } catch (error) {
      logger.error('Error handling state update:', error);
    }
  };

  // Setup tide update handler
  const handleTideUpdate = (data) => {
    try {
      logger.debug('Received tide update from relay');
      if (store && typeof store.updateTideData === 'function') {
        store.updateTideData(data);
      } else {
        logger.error('Store or updateTideData method not available');
      }
    } catch (error) {
      logger.error('Error handling tide update:', error);
    }
  };
  
  // Setup weather update handler
  const handleWeatherUpdate = (data) => {
    try {
      logger.debug('Received weather update from relay');
      if (store && typeof store.updateForecastData === 'function') {
        store.updateForecastData(data);
      } else {
        logger.error('Store or updateForecastData method not available');
      }
    } catch (error) {
      logger.error('Error handling weather update:', error);
    }
  };
  
  // Register event listeners
  relayConnectionBridge.on('state-update', handleStateUpdate);
  relayConnectionBridge.on('tide-update', handleTideUpdate);
  relayConnectionBridge.on('weather-update', handleWeatherUpdate);
  
  // Cleanup function
  const cleanup = () => {
    relayConnectionBridge.off('state-update', handleStateUpdate);
    relayConnectionBridge.off('tide-update', handleTideUpdate);
    relayConnectionBridge.off('weather-update', handleWeatherUpdate);
    subscribed = false;
    logger.info('Cleaned up relay event listeners');
  };
  
  logger.info('Relay Pinia sync initialized successfully');
  
  // Return cleanup function
  return cleanup;
}
