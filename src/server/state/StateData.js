// src/server/state/StateData.js

// Utility function for deep set
function setDeep(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  while (keys.length > 1) {
    const key = keys.shift();
    if (!(key in cur)) cur[key] = {};
    cur = cur[key];
  }
  cur[keys[0]] = value;
}

export const stateData = {
  navigation: {
    position: {
      latitude: null,
      longitude: null,
      timestamp: null,
      source: null,
    },
    course: {
      cog: null,
      heading: null,
      variation: null,
    },
    speed: {
      sog: null,
      stw: null,
    },
    trip: {
      log: null,
      lastReset: null,
    },
    depth: {
      belowTransducer: null,
      belowKeel: null,
      belowSurface: null,
    },
    wind: {
      speed: null,
      angle: null,
      direction: null,
    },
  },
 
  environment: {
    weather: {
      temperature: {
        air: null,
        water: null,
      },
      pressure: {
        value: null,
      },
      humidity: null,
    },
  },
  vessel: {
    info: {
      name: null,
      mmsi: null,
      callsign: null,
      type: null,
      length: null,
      beam: null,
      draft: null,
    },
    systems: {
      electrical: {
        batteries: null,
        sources: null,
      },
      propulsion: {
        engines: null,
        fuel: null,
      },
      tanks: {
        freshWater: null,
        wasteWater: null,
        blackWater: null,
      },
    },
  },
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
  batchUpdate(updates) {
    if (Array.isArray(updates)) {
      updates.forEach(({ path, value }) => setDeep(this, path, value));
    } else if (typeof updates === 'object' && updates !== null) {
      Object.entries(updates).forEach(([path, value]) => setDeep(this, path, value));
    } else {
      throw new TypeError('batchUpdate expects an array or object');
    }
  },
};
