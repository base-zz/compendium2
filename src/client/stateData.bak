// Browser-only copy of StateData for client use
import EventEmitter from 'events';

class StateData extends EventEmitter {
  // EVENTS will be assigned after the class body for compatibility

  constructor() {
    super();
    this.state = {
      // Navigation domain
      navigation: {
        position: { latitude: null, longitude: null, altitude: null, timestamp: null, source: null },
        course: { heading: null, cog: null, variation: null, timestamp: null, source: null },
        speed: { sog: null, stw: null, timestamp: null, source: null },
        depth: { belowTransducer: null, belowKeel: null, belowSurface: null, timestamp: null, source: null },
        wind: { speed: null, angle: null, direction: null, timestamp: null, source: null },
        trip: { log: null, lastReset: null, timestamp: null, source: null }
      },
      // Anchor domain
      anchor: {
        anchorDropLocation: {
          latitude: null,
          longitude: null,
          time: null,
          depth: null,
          distanceFromCurrentLocation: 0,
          distanceFromDropLocation: 0,
          originalBearing: 0,
        },
        anchorLocation: {
          latitude: null,
          longitude: null,
          time: null,
          depth: null,
          distanceFromCurrentLocation: 0,
          distanceFromDropLocation: 0,
          originalBearing: 0,
          bearing: 0,
        },
        aisTargets: [],
        rode: {
          amount: 0,
          units: "m",
        },
        dragging: false,
        anchorDeployed: false,
        criticalRange: {
          r: 0,
          units: "m",
        },
        warningRange: {
          r: 0,
          units: "m",
        },
        history: [],
        useDeviceGPS: true,
      },
      // Alerts domain
      alerts: {
        active: [],
        history: [],
        settings: {
          anchor: { enabled: true, radius: 50 },
          depth: { enabled: true, minimum: 2.0 }
        },
        timestamp: null,
        source: null
      },
      // Environment domain
      environment: {
        weather: {
          temperature: { air: null, water: null, timestamp: null, source: null },
          wind: { speed: null, angle: null, direction: null, speedApparent: null, angleApparent: null, reference: null, timestamp: null, source: null },
          pressure: { value: null, trend: null, timestamp: null, source: null },
          humidity: null,
          timestamp: null,
          source: null
        },
        tide: { height: null, timestamp: null, source: null }
      },
      // Vessel domain
      vessel: {
        info: { name: null, mmsi: null, callsign: null, type: null, length: null, beam: null, draft: null },
        systems: {
          electrical: { batteries: {}, sources: {}, loads: {}, timestamp: null, source: null },
          propulsion: { engines: {}, fuel: {}, timestamp: null, source: null },
          tanks: {},
          timestamp: null,
          source: null
        }
      },
      // External domain
      external: {
        // Placeholder for external data sources
      },
      // Meta domain
      meta: {
        lastUpdated: Date.now(),
        version: '1.0.0'
      }
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
