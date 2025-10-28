/**
 * Bluetooth Device Configuration
 * 
 * Defines device-specific settings and capabilities for different
 * Bluetooth device manufacturers.
 */

export const DEVICE_CONFIGS = {
  // RuuviTag (Manufacturer ID: 1177 / 0x0499)
  1177: {
    name: 'RuuviTag',
    manufacturer: 'Ruuvi Innovations',
    icon: 'thermometer-outline',
    fields: {
      userLabel: true,
      notes: true,
      encryptionKey: false  // ❌ Not needed
    },
    showLiveData: true,
    liveDataFields: ['temperature', 'humidity', 'pressure', 'battery']
  },
  
  // Victron Energy (Manufacturer ID: 737 / 0x02E1)
  737: {
    name: 'Victron Device',
    manufacturer: 'Victron Energy',
    icon: 'battery-charging-outline',
    fields: {
      userLabel: true,
      notes: true,
      encryptionKey: true  // ✅ Required!
    },
    encryptionKeyRequired: true,
    encryptionKeyValidation: /^[0-9a-fA-F]{32}$/,
    encryptionKeyHelp: 'Open VictronConnect app → Product Info → Copy "Instant readout details" key',
    showLiveData: true,
    liveDataFields: ['voltage', 'current', 'stateOfCharge', 'timeRemaining']
  },
  
  // Default for unknown devices
  default: {
    name: 'Bluetooth Device',
    manufacturer: 'Unknown',
    icon: 'bluetooth-outline',
    fields: {
      userLabel: true,
      notes: true,
      encryptionKey: false
    },
    showLiveData: false
  }
}

/**
 * Get device configuration by manufacturer ID
 * @param {number} manufacturerId - The manufacturer ID from the device
 * @returns {Object} Device configuration object
 */
export function getDeviceConfig(manufacturerId) {
  return DEVICE_CONFIGS[manufacturerId] || DEVICE_CONFIGS.default
}
