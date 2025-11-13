/**
 * User Preferences Store
 * 
 * This store manages user preferences for the application,
 * including unit display preferences (metric vs imperial).
 */

import { defineStore } from 'pinia';
import { reactive, computed, ref } from 'vue';
import { convertByPreference } from '@/utils/unitConversion';
import { createLogger } from '../services/logger';
import { stateUpdateProvider } from '../services/stateUpdateProvider';

const logger = createLogger('preferences-store');

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clonePreferencesObject(source) {
  try {
    return JSON.parse(JSON.stringify(source));
  } catch (error) {
    logger.warn('Failed to clone preferences object', error);
    return {};
  }
}

// Default preferences
const defaultPreferences = {
  units: {
    useImperial: true, // Default to metric
    depthDecimals: 1,
    speedDecimals: 1,
    temperatureDecimals: 1,
    distanceDecimals: 1,
    angleDecimals: 0
  },
  display: {
    darkMode: false,
    highContrast: false
  },
  logging: {
    // Log levels and remote toggle
    debug: false,
    data: false,   
    info: false,
    warn: true,
    error: true,
    remote: false,
    // Namespace filters (supports * wildcard)
    namespaces: []
  }
};

export const usePreferencesStore = defineStore('preferences', () => {
  // State
  const preferences = reactive(loadSavedPreferences());
  const rawPreferences = ref(clonePreferencesObject(preferences));
  const isFetchingFromServer = ref(false);

  function syncRawPreferences() {
    rawPreferences.value = clonePreferencesObject(preferences);
  }

  function applyServerPreferences(serverPreferences = {}) {
    if (!serverPreferences || typeof serverPreferences !== 'object') {
      logger.warn('Received invalid preferences payload from server', serverPreferences);
      return rawPreferences.value;
    }

    Object.keys(serverPreferences).forEach((key) => {
      const incomingSection = serverPreferences[key];
      if (isPlainObject(incomingSection) && isPlainObject(preferences[key])) {
        preferences[key] = {
          ...preferences[key],
          ...incomingSection,
        };
      } else {
        preferences[key] = incomingSection;
      }
    });

    syncRawPreferences();
    savePreferences();
    applyDisplayPreferences();

    if (serverPreferences.logging) {
      applyLoggingPreferences();
    }

    return rawPreferences.value;
  }

  applyDisplayPreferences();
  // Getters
  const useImperial = computed(() => preferences.units.useImperial);
  const darkMode = computed(() => preferences.display.darkMode);
  
  // Logging related getters
  const loggingEnabled = computed(() => ({
    remoteLogging: {
      ...preferences.logging.remoteLogging
    },
    namespaces: [...(preferences.logging.namespaces || [])]
  }));
  
  // Available loggers
  const availableLoggers = computed(() => [
    { name: 'app', description: 'Application logs' },
    { name: 'state', description: 'State management logs' },
    { name: 'data', description: 'Data logging (high volume)' },
    { name: 'network', description: 'Network request logs' },
    { name: 'error', description: 'Error logs' },
    { name: 'debug', description: 'Debug logs' },
    { name: 'warn', description: 'Warning logs' },
    { name: 'info', description: 'Info logs' },
    { name: 'verbose', description: 'Verbose logs' }
  ]);

  // Actions
  function formatValue(value, unit, customDecimals) {
    if (value === null || value === undefined) return '--';
    
    const useImperialVal = useImperial.value;
    let decimals = customDecimals;
    
    // If no custom decimals provided, use the default for the unit type
    if (decimals === undefined) {
      switch (unit) {
        case 'depth':
          decimals = preferences.units.depthDecimals;
          break;
        case 'speed':
          decimals = preferences.units.speedDecimals;
          break;
        case 'temperature':
          decimals = preferences.units.temperatureDecimals;
          break;
        case 'distance':
          decimals = preferences.units.distanceDecimals;
          break;
        case 'angle':
          decimals = preferences.units.angleDecimals;
          break;
        default:
          decimals = 2;
      }
    }
    
    return convertByPreference(value, unit, useImperialVal, decimals);
  }

  function getFormattedValueDetails(value, unit, customDecimals) {
    if (value === null || value === undefined) {
      return {
        original: value,
        formatted: '--',
        unit: '',
        useImperial: useImperial.value
      };
    }
    
    const useImperialVal = useImperial.value;
    let decimals = customDecimals;
    
    // If no custom decimals provided, use the default for the unit type
    if (decimals === undefined) {
      switch (unit) {
        case 'depth':
          decimals = preferences.units.depthDecimals;
          break;
        case 'speed':
          decimals = preferences.units.speedDecimals;
          break;
        case 'temperature':
          decimals = preferences.units.temperatureDecimals;
          break;
        case 'distance':
          decimals = preferences.units.distanceDecimals;
          break;
        case 'angle':
          decimals = preferences.units.angleDecimals;
          break;
        default:
          decimals = 2;
      }
    }
    
    const formatted = convertByPreference(value, unit === 'distance' ? 'length' : unit, useImperialVal, decimals);
    
    return {
      original: value,
      formatted,
      unit: useImperialVal 
        ? (unit === 'depth' || unit === 'distance' ? 'ft' : 
           unit === 'speed' ? 'kn' : 
           unit === 'temperature' ? '°F' : '')
        : (unit === 'depth' || unit === 'distance' ? 'm' : 
           unit === 'speed' ? 'kn' : 
           unit === 'temperature' ? '°C' : ''),
      useImperial: useImperialVal
    };
  }

  function toggleUnits() {
    preferences.units.useImperial = !preferences.units.useImperial;
    savePreferences();
    syncRawPreferences();
    logger(`Units toggled to ${preferences.units.useImperial ? 'imperial' : 'metric'}`);
    return preferences.units.useImperial;
  }

  function setDarkMode(enabled) {
    const desired = Boolean(enabled);
    if (preferences.display.darkMode === desired) {
      applyDisplayPreferences();
      return preferences.display.darkMode;
    }
    preferences.display.darkMode = desired;
    savePreferences();
    syncRawPreferences();
    applyDisplayPreferences();
    return preferences.display.darkMode;
  }

  async function resetPreferences() {
    Object.assign(preferences, JSON.parse(JSON.stringify(defaultPreferences)));
    await savePreferences();
    syncRawPreferences();
  }

  const setLoggingPreference = (key, value, enabled) => {
    // Handle both simple key-value pairs and namespace-based preferences
    if (enabled !== undefined) {
      // Namespace-based preference (backward compatibility)
      const namespace = key;
      enabled = value;
      
      if (!preferences.logging.namespaces) {
        preferences.logging.namespaces = [];
      }
      
      const existingIndex = preferences.logging.namespaces.indexOf(namespace);
      
      if (enabled && existingIndex === -1) {
        preferences.logging.namespaces.push(namespace);
      } else if (!enabled && existingIndex !== -1) {
        preferences.logging.namespaces.splice(existingIndex, 1);
      }
    } else {
      // Simple key-value preference
      preferences.logging = {
        ...preferences.logging,
        [key]: value
      };
    }
    
    savePreferences();
    syncRawPreferences();
    applyLoggingPreferences();
    return true;
  }

  // Alias for backward compatibility
  const setRemoteLogging = (key, value) => {
    setLoggingPreference(key, value);
  }

  function resetLoggingPreferences() {
    if (defaultPreferences.logging) {
      preferences.logging = JSON.parse(JSON.stringify(defaultPreferences.logging));
      savePreferences();
      syncRawPreferences();
      applyLoggingPreferences();
      return true;
    }
    return false;
  }

  async function applyLoggingPreferences() {
    try {
      if (!preferences.logging) return false;
      
      // Apply logging levels to the logger if available
      if (window.logger) {
        // Apply remote logging setting
        if (typeof preferences.logging.remote !== 'undefined' && 
            window.logger.setRemoteLogging) {
          window.logger.setRemoteLogging(preferences.logging.remote);
        }
        
        // Apply individual log level settings
        const logLevels = ['debug', 'info', 'warn', 'error', 'data'];
        logLevels.forEach(level => {
          if (typeof preferences.logging[level] !== 'undefined' && 
              window.logger[level]?.setRemoteLogging) {
            window.logger[level].setRemoteLogging(preferences.logging[level]);
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error applying logging preferences:', error);
      return false;
    }
  }

  // Initialize logging when the store is created
  applyLoggingPreferences();

  async function loadPreferencesFromServer() {
    logger.info('Skipping server preferences bootstrap - no remote endpoint available');
    return rawPreferences.value;
  }

  stateUpdateProvider.subscribe(handleProviderEvent);
  function handleProviderEvent(evt) {
    if (!evt || evt.type !== 'preferences:update') {
      return;
    }

    applyServerPreferences(evt.preferences || {});
  }

  loadPreferencesFromServer().catch((error) => {
    logger.error('Initial preferences bootstrap failed', error);
  });

  // Helper functions
  function loadSavedPreferences() {
    logger.info('Loading preferences from localStorage');
    try {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) {
        logger.info('Found saved preferences');
        const parsed = JSON.parse(savedPrefs);
        if (parsed?.logging) {
          parsed.logging.info = false;
          parsed.logging.debug = false;
          parsed.logging.data = false;
        }
        return parsed;
      }
      logger.info('No saved preferences found, using defaults');
      return JSON.parse(JSON.stringify(defaultPreferences));
    } catch (error) {
      logger.error('Error loading preferences from localStorage:', error);
      const fallback = JSON.parse(JSON.stringify(defaultPreferences));
      fallback.logging.info = false;
      fallback.logging.debug = false;
      fallback.logging.data = false;
      return fallback;
    }
  }

  async function savePreferences() {
    try {
      // Attempt to stringify first to catch serialization errors more directly
      const preferencesString = JSON.stringify(preferences);
      localStorage.setItem('userPreferences', preferencesString);
      logger.info('Preferences saved to localStorage'); // Corrected logger call
      return true;
    } catch (error) {
      // Log both the error and the preferences object for better debugging
      logger.error('Error saving preferences. Error:', error, 'Preferences object:', preferences);
      return false;
    }
  }

  function applyDisplayPreferences() {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }
    if (preferences.display?.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  // Log the store methods being returned
  return {
    // State
    preferences,
    rawPreferences,
    isFetchingFromServer,

    // Getters
    useImperial,
    darkMode,
    loggingEnabled,
    availableLoggers,
    
    // Actions
    formatValue,
    getFormattedValueDetails,
    toggleUnits,
    resetPreferences,
    resetLoggingPreferences,
    setLoggingPreference,
    setRemoteLogging,
    setDarkMode,
    applyLoggingPreferences,
    applyServerPreferences,
    loadPreferencesFromServer,
    savePreferences, // Expose savePreferences as an action
  };
});

// Export the store definition only, let Pinia handle instantiation
export default usePreferencesStore;
