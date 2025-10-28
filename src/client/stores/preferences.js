/**
 * User Preferences Store
 * 
 * This store manages user preferences for the application,
 * including unit display preferences (metric vs imperial).
 */

import { defineStore } from 'pinia';
import { reactive, computed } from 'vue';
import { convertByPreference } from '@client/utils/unitConversion';
import { createLogger } from '../services/logger';

const logger = createLogger('preferences-store');

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
    info: true,
    warn: true,
    error: true,
    remote: false,
    // Namespace filters (supports * wildcard)
    namespaces: []
  }
};

console.log('Defining preferences store...');

export const usePreferencesStore = defineStore('preferences', () => {
  console.log('Preferences store setup function running...');
  // State
  const preferences = reactive(loadSavedPreferences());


  console.log("LOADED PREFERENCES",   preferences.value);
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
    logger(`Units toggled to ${preferences.units.useImperial ? 'imperial' : 'metric'}`);
    return preferences.units.useImperial;
  }

  async function resetPreferences() {
    Object.assign(preferences, JSON.parse(JSON.stringify(defaultPreferences)));
    await savePreferences();
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

  // Helper functions
  function loadSavedPreferences() {
    logger.info('Loading preferences from localStorage');
    try {
      const savedPrefs = localStorage.getItem('userPreferences');
      if (savedPrefs) {
        logger.info('Found saved preferences');
        return JSON.parse(savedPrefs);
      }
      logger.info('No saved preferences found, using defaults');
      return JSON.parse(JSON.stringify(defaultPreferences));
    } catch (error) {
      logger.error('Error loading preferences from localStorage:', error);
      return JSON.parse(JSON.stringify(defaultPreferences));
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

  // Log the store methods being returned
  const debugInfo = {
    preferences: !!preferences,
    useImperial: 'computed',
    darkMode: 'computed',
    loggingEnabled: 'computed',
    availableLoggers: 'computed',
    formatValue: typeof formatValue === 'function',
    getFormattedValueDetails: typeof getFormattedValueDetails === 'function',
    toggleUnits: typeof toggleUnits === 'function',
    resetPreferences: typeof resetPreferences === 'function',
    resetLoggingPreferences: typeof resetLoggingPreferences === 'function',
    setLoggingPreference: typeof setLoggingPreference === 'function',
    setRemoteLogging: typeof setRemoteLogging === 'function',
    applyLoggingPreferences: typeof applyLoggingPreferences === 'function',
    savePreferences: typeof savePreferences === 'function'
  };
  
  console.log('Returning store with methods:', debugInfo);

  return {
    // State
    preferences,
    
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
    applyLoggingPreferences,
    savePreferences, // Expose savePreferences as an action
  };
});

// Debug: Log store definition
console.log('Preferences store defined with ID:', 'preferences');

// Export the store definition only, let Pinia handle instantiation
export default usePreferencesStore;
