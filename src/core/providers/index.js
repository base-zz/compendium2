import { AnchorProvider } from './AnchorProvider';
import { NavigationProvider } from './NavigationProvider';
import { AlertsProvider } from './AlertsProvider';

// Create provider instances
export const anchorProvider = new AnchorProvider();
export const navigationProvider = new NavigationProvider();
export const alertsProvider = new AlertsProvider();

// Export provider classes for testing/extension
export { AnchorProvider, NavigationProvider, AlertsProvider };

// Export all providers as a collection
export const providers = {
  anchor: anchorProvider,
  navigation: navigationProvider,
  alerts: alertsProvider
};

/**
 * Initialize all providers
 * @returns {Promise<void>}
 */
export async function initializeProviders() {
  console.log('[CORE] Initializing data providers');
  
  // Add any provider-specific initialization here
  
  return providers;
}
