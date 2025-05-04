// Browser-only copy of StateData for client use
import EventEmitter from 'events';

class StateData extends EventEmitter {
  // EVENTS will be assigned after the class body for compatibility

  constructor() {
    super();
    this.state = {
      navigation: {
        position: {
          latitude: { value: null, units: "deg" },
          longitude: { value: null, units: "deg" },
          altitude: { value: null, units: "m", feet: null },
          timestamp: null,
          source: null,
          gnss: {
            satellites: { value: null, units: "count" },
            hdop: { value: null, units: "ratio" },
            pdop: { value: null, units: "ratio" },
          },
        },
        course: {
          cog: { value: null, units: "rad", degrees: null },
          heading: {
            magnetic: { value: null, units: "rad", degrees: null },
            true: { value: null, units: "rad", degrees: null },
          },
          variation: { value: null, units: "rad", degrees: null },
          rateOfTurn: { value: null, units: "rad/s", degPerMin: null },
        },
        speed: {
          sog: { value: null, units: "m/s", knots: null },
          stw: { value: null, units: "m/s", knots: null },
        },
        trip: {
          log: { value: null, units: "m", nauticalMiles: null },
          lastReset: null,
        },
        depth: {
          belowTransducer: { value: null, units: "m", feet: null },
          belowKeel: { value: null, units: "m", feet: null },
          belowSurface: { value: null, units: "m", feet: null },
        },
        wind: {
          apparent: {
            speed: { value: null, units: "m/s", knots: null },
            angle: { value: null, units: "rad", degrees: null, side: null },
            direction: {
              value: null,
              units: "rad",
              degrees: null,
              reference: "true",
            },
          },
          true: {
            speed: { value: null, units: "m/s", knots: null },
            direction: {
              value: null,
              units: "rad",
              degrees: null,
              reference: "true",
            },
          },
        },
      },
      environment: {
        weather: {
          temperature: {
            air: { value: null, units: "°C", fahrenheit: null },
            water: { value: null, units: "°C", fahrenheit: null },
          },
          pressure: {
            value: null,
            units: "Pa",
            hPa: null,
            inHg: null,
          },
          humidity: { value: null, units: "%" },
        },
      },
      vessel: {
        info: {
          name: null,
          mmsi: null,
          callsign: null,
          type: null,
          dimensions: {
            length: { value: null, units: "m", feet: null },
            beam: { value: null, units: "m", feet: null },
            draft: { value: null, units: "m", feet: null },
          },
        },
        systems: {
          electrical: {
            batteries: {
              voltage: { value: null, units: "V" },
              current: { value: null, units: "A" },
            },
            sources: null,
          },
          propulsion: {
            engines: {
              rpm: { value: null, units: "rpm" },
              hours: { value: null, units: "hours" },
            },
            fuel: {
              level: { value: null, units: "L", gallons: null },
              rate: { value: null, units: "L/h", gph: null },
            },
          },
          tanks: {
            freshWater: { value: null, units: "L", gallons: null },
            wasteWater: { value: null, units: "L", gallons: null },
            blackWater: { value: null, units: "L", gallons: null },
          },
        },
      },
      anchor: {
        anchorDropLocation: {
          position: {
            latitude: { value: null, units: "deg" },
            longitude: { value: null, units: "deg" },
          },
          time: null,
          depth: { value: null, units: "m", feet: null },
          distancesFromCurrent: {
            value: 0,
            units: "m",
            nauticalMiles: null,
          },
          distancesFromDrop: {
            value: 0,
            units: "m",
            nauticalMiles: null,
          },
          originalBearing: { value: 0, units: "rad", degrees: null },
          bearing: { value: 0, units: "rad", degrees: null },
        },
        anchorLocation: {
          position: {
            latitude: { value: null, units: "deg" },
            longitude: { value: null, units: "deg" },
          },
          time: null,
          depth: { value: null, units: "m", feet: null },
          distancesFromCurrent: { value: 0, units: "m", nauticalMiles: null },
          distancesFromDrop: { value: 0, units: "m", nauticalMiles: null },
          originalBearing: { value: 0, units: "rad", degrees: null },
          bearing: { value: 0, units: "rad", degrees: null },
        },
        aisTargets: {},
        rode: {
          amount: 0,
          units: "m",
        },
        criticalRange: {
          r: 0,
          units: "m",
        },
        warningRange: {
          r: 0,
          units: "m",
        },
        defaultScope: {
          value: 5,
          units: "ratio",
        },
        dragging: false,
        anchorDeployed: false,
        history: [],
        useDeviceGPS: true,
      },      
      // Alert datum structure reference:
// {
//   id: string,
//   type: string,              // 'signalk', 'user', 'system', 'weather', etc.
//   category: string,          // 'navigation', 'anchor', etc.
//   source: string,            // Origin system/module
//   level: string,             // 'info', 'warning', 'critical', 'emergency', etc.
//   label: string,             // Short title
//   message: string,           // Main user-facing message
//   timestamp: string,         // ISO8601
//   acknowledged: boolean,
//   muted: boolean,
//   mutedUntil: string,        // ISO8601 or null
//   mutedBy: string,           // Who/what muted this alert
//   status: string,            // 'active', 'resolved', etc.
//   trigger: string,           // Human-readable trigger
//   ruleId: string,            // Rule/definition id
//   data: object,              // Source/type-specific data
//   actions: string[],         // e.g. ['acknowledge', 'mute']
//   phoneNotification: boolean,// Should trigger phone notification?
//   sticky: boolean,           // Persist until handled?
//   externalId: string,        // External system id
//   deviceTargets: string[],   // Device ids to notify
//   expiresAt: string          // ISO8601, auto-expiry
// }
alerts: {
  active: [],           // Currently active alerts/notifications
  history: [],          // Past/resolved alerts (optional)
  definitions: [],      // User/system-defined alert rules (optional)
  processingQueue: [],  // Alert ids currently being processed (optional)
  muted: [],            // Alert ids currently muted (optional)
  deviceSubscriptions: {} // deviceId => [alert types/categories] (optional)
},
    };

  }

  // Add get(path) method for compatibility
  get(path) {
    // Support dot notation, e.g., 'navigation.position'
    return path.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), this.state);
  }
}

import { EVENTS } from '../shared/constants.js';

StateData.EVENTS = EVENTS;
const stateData = new StateData();

export { stateData, StateData };
