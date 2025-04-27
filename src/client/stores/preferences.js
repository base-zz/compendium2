/**
 * User Preferences Store
 * 
 * This store manages user preferences for the application,
 * including unit display preferences (metric vs imperial).
 */

import { reactive } from 'vue';
import { convertByPreference } from '@/utils/unitConversion';

// Default preferences
const defaultPreferences = {
  units: {
    useImperial: false, // Default to metric
    depthDecimals: 1,
    speedDecimals: 1,
    temperatureDecimals: 1,
    distanceDecimals: 1,
    angleDecimals: 0
  },
  display: {
    darkMode: false,
    highContrast: false
  }
};

// Initialize preferences from localStorage or use defaults
const loadSavedPreferences = () => {
  try {
    const savedPrefs = localStorage.getItem('userPreferences');
    return savedPrefs ? JSON.parse(savedPrefs) : defaultPreferences;
  } catch (error) {
    console.error('[PreferencesStore] Error loading preferences:', error);
    return defaultPreferences;
  }
};

// Create reactive store
const preferences = reactive(loadSavedPreferences());

// Save preferences to localStorage
const savePreferences = () => {
  try {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    console.log('[PreferencesStore] Preferences saved');
  } catch (error) {
    console.error('[PreferencesStore] Error saving preferences:', error);
  }
};

/**
 * Format a value according to user preferences
 * @param {number} value - The value to format
 * @param {string} unit - The unit type ('depth', 'speed', 'temperature', etc.)
 * @param {number} [customDecimals] - Custom decimal precision (optional)
 * @returns {string} - Formatted value with unit
 */
function formatValue(value, unit, customDecimals) {
  if (value === undefined || value === null) {
    return 'N/A';
  }
  
  const useImperial = preferences.units.useImperial;
  let decimals = customDecimals; // Use custom decimals if provided
  
  // If no custom decimals provided, get the appropriate decimal precision based on unit type
  if (decimals === null || decimals === undefined) {
    switch (unit) {
      case 'depth':
      case 'length':
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
      case 'ratio':
        decimals = 1; // Default for ratio
        break;
      default:
        decimals = 1; // Default
    }
  }
  
  return convertByPreference(value, unit, useImperial, decimals);
}

/**
 * Get detailed information about a formatted value
 * @param {number} value - The value to format
 * @param {string} unit - The unit type ('depth', 'speed', 'temperature', etc.)
 * @param {number} [customDecimals] - Custom decimal precision (optional)
 * @returns {Object} - Object containing original and formatted values with units
 */
function getFormattedValueDetails(value, unit, customDecimals) {
  if (value === undefined || value === null) {
    return {
      originalValue: value,
      originalUnits: unit,
      formattedValue: 'N/A',
      formattedUnits: unit
    };
  }
  
  const useImperial = preferences.units.useImperial;
  let decimals = customDecimals; // Use custom decimals if provided
  
  // If no custom decimals provided, get the appropriate decimal precision based on unit type
  if (decimals === null || decimals === undefined) {
    switch (unit) {
      case 'depth':
      case 'length':
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
      case 'ratio':
        decimals = 1; // Default for ratio
        break;
      default:
        decimals = 1; // Default
    }
  }
  
  const formatted = convertByPreference(value, unit === 'distance' ? 'length' : unit, useImperial, decimals);
  const [formattedValue, formattedUnits] = formatted.split(' ');
  
  return {
    originalValue: value,
    originalUnits: unit,
    formattedValue: formattedValue,
    formattedUnits: formattedUnits
  };
}

/**
 * Toggle between metric and imperial units
 */
function toggleUnits() {
  preferences.units.useImperial = !preferences.units.useImperial;
  savePreferences();
}

/**
 * Set specific unit preference
 * @param {string} key - Preference key
 * @param {any} value - Preference value
 */
function setPreference(key, value) {
  // Handle nested preferences
  if (key.includes('.')) {
    const [section, setting] = key.split('.');
    if (preferences[section] && setting in preferences[section]) {
      preferences[section][setting] = value;
    }
  } else if (key in preferences) {
    preferences[key] = value;
  }
  
  savePreferences();
}

/**
 * Reset preferences to default values
 */
function resetPreferences() {
  Object.assign(preferences, defaultPreferences);
  savePreferences();
}

// Export store
export default {
  // State
  preferences,
  
  // Getters
  get useImperial() { return preferences.units.useImperial; },
  get darkMode() { return preferences.display.darkMode; },
  
  // Actions
  formatValue,
  getFormattedValueDetails,
  toggleUnits,
  setPreference,
  resetPreferences
};
