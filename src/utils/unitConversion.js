/**
 * Unit conversion utilities
 * Handles conversion between metric and imperial units
 */

/**
 * Convert a value based on user preference (metric/imperial)
 * @param {number} value - The value to convert
 * @param {string} unit - The unit type ('depth', 'speed', 'temperature', 'length', etc.)
 * @param {boolean} useImperial - Whether to use imperial units
 * @param {number} [decimals=2] - Number of decimal places to round to
 * @returns {number} - Converted value
 */
export function convertByPreference(value, unit, useImperial = false, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return value;
  }

  // Convert to number in case it's a string
  const numValue = Number(value);
  
  // Conversion factors
  const METERS_TO_FEET = 3.28084;
  const KNOTS_TO_MPH = 1.15078;
  const KELVIN_OFFSET = 273.15;
  const FAHRENHEIT_OFFSET = 32;
  const NAUTICAL_MILES_TO_MILES = 1.15078;
  const KILOMETERS_TO_MILES = 0.621371;
  const LITERS_TO_GALLONS = 0.264172;
  const KILOGRAMS_TO_POUNDS = 2.20462;

  let convertedValue = numValue;
  let convertedUnit = unit;

  if (useImperial) {
    switch (unit) {
      case 'depth':
      case 'length':
      case 'distance':
        convertedValue = numValue * METERS_TO_FEET; // meters to feet
        convertedUnit = unit === 'temperature' ? unit : 'feet';
        break;
      case 'speed':
        convertedValue = numValue * KNOTS_TO_MPH; // knots to mph
        convertedUnit = 'mph';
        break;
      case 'temperature':
        // Convert from Kelvin to Fahrenheit: (K − 273.15) × 9/5 + 32
        convertedValue = (numValue - KELVIN_OFFSET) * 9/5 + FAHRENHEIT_OFFSET;
        convertedUnit = '°F';
        break;
      case 'volume':
        convertedValue = numValue * LITERS_TO_GALLONS; // liters to gallons
        convertedUnit = 'gal';
        break;
      case 'weight':
        convertedValue = numValue * KILOGRAMS_TO_POUNDS; // kg to lbs
        convertedUnit = 'lbs';
        break;
      default:
        // No conversion needed or unknown unit
        break;
    }
  } else {
    // Convert to metric if needed (for consistency, though we typically store in metric)
    switch (unit) {
      case 'depth':
      case 'length':
      case 'distance':
        convertedUnit = 'm';
        break;
      case 'speed':
        convertedUnit = 'kn';
        break;
      case 'temperature':
        convertedUnit = '°C';
        break;
      case 'volume':
        convertedUnit = 'L';
        break;
      case 'weight':
        convertedUnit = 'kg';
        break;
      default:
        break;
    }
  }

  // Round to specified number of decimals
  if (decimals !== undefined) {
    const factor = Math.pow(10, decimals);
    convertedValue = Math.round(convertedValue * factor) / factor;
  }

  return convertedValue;
}

/**
 * Convert a value from one unit to another
 * @param {number} value - The value to convert
 * @param {string} fromUnit - The source unit
 * @param {string} toUnit - The target unit
 * @param {number} [decimals=2] - Number of decimal places to round to
 * @returns {number} - Converted value
 */
export function convertUnit(value, fromUnit, toUnit, decimals = 2) {
  if (fromUnit === toUnit) return value;
  
  // This is a simplified version - you would expand this with actual conversion logic
  // For now, we'll just use the convertByPreference function with a flag
  const isImperial = toUnit.includes('°F') || toUnit === 'ft' || toUnit === 'mi' || toUnit === 'mph' || toUnit === 'gal' || toUnit === 'lbs';
  
  return convertByPreference(value, fromUnit, isImperial, decimals);
}

export default {
  convertByPreference,
  convertUnit
};
