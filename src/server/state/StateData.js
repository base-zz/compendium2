function setDeep(obj, path, value) {
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur = obj;
  let parent = null;
  let parentKey = null;

  while (keys.length > 1) {
    const key = keys.shift();
    const keyAsNum = Number(key);
    const isArrayKey = Number.isInteger(keyAsNum) && key === String(keyAsNum);

    parent = cur;
    parentKey = key;

    if (isArrayKey) {
      if (!Array.isArray(parent[parentKey])) {
        parent[parentKey] = []; // Preserve reference by assigning to parent
      }
      cur = parent[parentKey];
      if (cur[keyAsNum] === undefined) {
        cur[keyAsNum] = {};
      }
      cur = cur[keyAsNum];
    } else {
      if (
        typeof cur[key] !== "object" ||
        cur[key] === null ||
        Array.isArray(cur[key])
      ) {
        cur[key] = {};
      }
      cur = cur[key];
    }
  }

  const finalKey = keys[0];
  const finalKeyAsNum = Number(finalKey);
  const isFinalArrayKey =
    Number.isInteger(finalKeyAsNum) && finalKey === String(finalKeyAsNum);

  if (isFinalArrayKey && Array.isArray(cur)) {
    cur[finalKeyAsNum] = value;
  } else {
    cur[finalKey] = value;
  }

  return obj;
}

export const stateData = {
  navigation: {
    position: {
      latitude: { value: null, units: "deg" },
      longitude: { value: null, units: "deg" },
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
      belowTransducer: {
        value: null,
        units: "m",
        feet: { value: null }, // Initialize with feet structure
      },
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
    aisTargets: [],
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
  alerts: { active: [], processingQueue: [] },
  convert: {
    // Length/Distance
    mToFeet(m) {
      return m !== null ? Math.round(m * 3.28084 * 10) / 10 : null;
    },
    mToNauticalMiles(m) {
      return m !== null ? Math.round((m / 1852) * 10) / 10 : null;
    },

    // Speed (1 decimal)
    mpsToKnots(mps) {
      return mps !== null ? Math.round(mps * 1.94384 * 10) / 10 : null;
    },

    // Angle (1 decimal for degrees)
    radToDeg(rad) {
      return rad !== null ? Math.round(rad * (180 / Math.PI) * 10) / 10 : null;
    },

    // Temperature (1 decimal)
    cToF(c) {
      return c !== null ? Math.round(((c * 9) / 5 + 32) * 10) / 10 : null;
    },

    // Pressure (1 decimal)
    paToHpa(pa) {
      return pa !== null ? Math.round((pa / 100) * 10) / 10 : null;
    },
    paToInHg(pa) {
      return pa !== null ? Math.round((pa / 3386.39) * 10) / 10 : null;
    },

    // Volume (1 decimal)
    litersToGallons(l) {
      return l !== null ? Math.round(l * 0.264172 * 10) / 10 : null;
    },

    updateAllDerivedValues() {
      this.convertPositionValues();
      this.convertCourseValues();
      this.convertSpeedValues();
      this.convertWindValues();
      this.convertAnchorValues();
      this.convertDepthValues(); // Add this line
    },

    convertAnchorValues() {
      const convertAnchorLocation = (location) => {
        if (!location) return;
        if (location.distancesFromCurrent.value !== null) {
          location.distancesFromCurrent.nauticalMiles = this.mToNauticalMiles(
            location.distancesFromCurrent.value
          );
          location.distancesFromCurrent.feet = this.mToFeet(
            location.distancesFromCurrent.value
          );
        }

        if (location.distancesFromDrop.value !== null) {
          location.distancesFromDrop.nauticalMiles = this.mToNauticalMiles(
            location.distancesFromDrop.value
          );
          location.distancesFromDrop.feet = this.mToFeet(
            location.distancesFromDrop.value
          );
        }
      };

      if (this.anchor) {
        convertAnchorLocation(this.anchor.anchorDropLocation);
        convertAnchorLocation(this.anchor.anchorLocation);
      }
    },

    convertCourseValues() {
      const course = stateData.navigation?.course;
      if (!course) return;

      // COG
      if (course.cog.value !== null) {
        course.cog.degrees = stateData.convert.radToDeg(course.cog.value);
      }

      // Heading
      if (course.heading.magnetic.value !== null) {
        course.heading.magnetic.degrees = stateData.convert.radToDeg(
          course.heading.magnetic.value
        );
      }
      if (course.heading.true.value !== null) {
        course.heading.true.degrees = stateData.convert.radToDeg(
          course.heading.true.value
        );
      }

      // Rate of turn
      if (course.rateOfTurn.value !== null) {
        course.rateOfTurn.degPerMin =
          Math.round(
            stateData.convert.radToDeg(course.rateOfTurn.value) * 60 * 10
          ) / 10;
      }
    },

    convertDepthValues() {
      const depth = stateData.navigation?.depth;
      if (!depth) return;

      // Ensure feet structure exists
      const ensureFeet = (obj) => {
        if (obj && !obj.feet) obj.feet = { value: null };
        return obj;
      };

      [depth.belowTransducer, depth.belowKeel, depth.belowSurface]
        .filter(Boolean)
        .forEach(ensureFeet);

      if (depth.belowTransducer?.value !== null) {
        depth.belowTransducer.feet.value = stateData.convert.mToFeet(
          depth.belowTransducer.value
        );
      }
    },

    convertSpeedValues() {
      const speed = stateData.navigation?.speed;
      if (!speed) return;

      if (speed.sog.value !== null) {
        speed.sog.knots = stateData.convert.mpsToKnots(speed.sog.value);
      }

      if (speed.stw.value !== null) {
        speed.stw.knots = stateData.convert.mpsToKnots(speed.stw.value);
      }
    },

    convertPositionValues() {
      const pos = stateData.navigation?.position;
      if (!pos) return;
 
    },

    convertWindValues() {
      const wind = stateData.navigation?.wind;
      if (!wind) return;

      // Apparent wind
      if (wind.apparent?.angle?.value !== undefined) {
        wind.apparent.angle.degrees = stateData.convert.radToDeg(
          wind.apparent.angle.value
        );
        wind.apparent.angle.side =
          wind.apparent.angle.value >= 0 ? "starboard" : "port";

        if (wind.apparent?.speed?.value !== undefined) {
          wind.apparent.speed.knots = stateData.convert.mpsToKnots(
            wind.apparent.speed.value
          );
        }
      }

      // True wind
      if (wind.true?.angle?.value !== undefined) {
        wind.true.angle.degrees = stateData.convert.radToDeg(
          wind.true.angle.value
        );
        wind.true.angle.side =
          wind.true.angle.value >= 0 ? "starboard" : "port";

        if (wind.true?.speed?.value !== undefined) {
          wind.true.speed.knots = stateData.convert.mpsToKnots(
            wind.true.speed.value
          );
        }
      }
    },
  }, // Close the methods object

  batchUpdate(updates) {
    // First ensure all required structures exist
    this.ensureDataStructures();

    // Process updates
    if (Array.isArray(updates)) {
      updates.forEach(({ path, value }) => {
        try {
          setDeep(this, path, value);
        } catch (error) {
          console.warn(`Failed to update path ${path}:`, error);
        }
      });
    } else if (typeof updates === "object") {
      Object.entries(updates).forEach(([path, value]) => {
        try {
          setDeep(this, path, value);
        } catch (error) {
          console.warn(`Failed to update path ${path}:`, error);
        }
      });
    }
    return true;
  },

  ensureDataStructures() {
    // Depth measurements
    ["belowTransducer", "belowKeel", "belowSurface"].forEach((key) => {
      if (!this.navigation.depth[key]) {
        this.navigation.depth[key] = { value: null, units: "m" };
      }
      if (!this.navigation.depth[key].feet) {
        this.navigation.depth[key].feet = { value: null };
      }
    });
  },

  get state() {
    return structuredClone({
      navigation: this.navigation,
      environment: this.environment,
      vessel: this.vessel,
      anchor: this.anchor,
    });
  },
};
