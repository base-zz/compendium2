/**
 * Core Module Entry Point
 * 
 * Provides a unified interface to the core functionality:
 * - Provider system for data access
 * - State management
 * - Rule engine
 * - Synchronization framework
 */

import { initializeProviders, providers } from './providers';
import { StateManager } from '../relay/server/core/state/StateManager.js';
import { RuleEngine } from './ruleEngine';
import { initializeRxAdapter, streams } from './rx-adapter';

// Create singleton instances
export const stateManager = new StateManager();

/**
 * Initialize the core system
 * @returns {Promise<Object>} The initialized core system
 */
export async function initializeCore() {
  console.log('[CORE] Initializing core system');
  
  // Initialize providers first
  await initializeProviders();
  
  // Initialize RxJS adapter if needed
  initializeRxAdapter();
  
  return {
    providers,
    stateManager,
    streams
  };
}

// Export individual components
export { providers };
export { streams };
export { RuleEngine };
