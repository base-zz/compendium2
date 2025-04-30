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
  convert: {
    // Length/Distance
    mToFeet(m) {
      return m !== null ? m * 3.28084 : null;
    },
    mToNauticalMiles(m) {
      return m !== null ? m / 1852 : null;
    },

    // Speed
    mpsToKnots(mps) {
      return mps !== null ? mps * 1.94384 : null;
    },

    // Angle
    radToDeg(rad) {
      return rad !== null ? rad * (180 / Math.PI) : null;
    },

    // Temperature
    cToF(c) {
      return c !== null ? (c * 9) / 5 + 32 : null;
    },

    // Pressure
    paToHpa(pa) {
      return pa !== null ? pa / 100 : null;
    },
    paToInHg(pa) {
      return pa !== null ? pa / 3386.39 : null;
    },

    // Volume
    litersToGallons(l) {
      return l !== null ? l * 0.264172 : null;
    },

    updateAllDerivedValues() {
      // Navigation conversions
      this.convertPositionValues();
      this.convertCourseValues();
      this.convertSpeedValues();
      this.convertWindValues();
      this.convertAnchorValues();
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
      const course = this.navigation && this.navigation.course;
      if (!course) return;

      // COG
      if (course.cog.value !== null) {
        course.cog.degrees = this.radToDeg(course.cog.value);
      }

      // Heading
      if (course.heading.magnetic.value !== null) {
        course.heading.magnetic.degrees = this.radToDeg(
          course.heading.magnetic.value
        );
      }
      if (course.heading.true.value !== null) {
        course.heading.true.degrees = this.radToDeg(course.heading.true.value);
      }

      // Rate of turn
      if (course.rateOfTurn.value !== null) {
        course.rateOfTurn.degPerMin =
          this.radToDeg(course.rateOfTurn.value) * 60;
      }
    },

    convertSpeedValues() {
      const speed = this.navigation && this.navigation.speed;
      if (!speed) return;

      if (speed.sog.value !== null) {
        speed.sog.knots = this.mpsToKnots(speed.sog.value);
      }

      if (speed.stw.value !== null) {
        speed.stw.knots = this.mpsToKnots(speed.stw.value);
      }
    },

    convertPositionValues() {
      const pos = this.navigation && this.navigation.position;
      if (!pos) return;
      if (pos.altitude && pos.altitude.value !== null) {
        pos.altitude.feet = this.mToFeet(pos.altitude.value);
      }
      // Add other position conversions
    },

    convertWindValues() {
      const wind = this.navigation && this.navigation.wind;
      if (!wind) return;

      // Apparent wind
      if (wind.apparent.angle.value !== null) {
        wind.apparent.angle.degrees = this.radToDeg(wind.apparent.angle.value);
        wind.apparent.angle.side =
          wind.apparent.angle.value >= 0 ? "starboard" : "port";
      }

      if (wind.apparent.speed.value !== null) {
        wind.apparent.speed.knots = this.mpsToKnots(wind.apparent.speed.value);
      }

      // True wind (similar conversions)
      if (wind.true.angle.value !== null) {
        wind.true.angle.degrees = this.radToDeg(wind.true.angle.value);
        wind.true.angle.side =
          wind.true.angle.value >= 0 ? "starboard" : "port";
      }

      if (wind.true.speed.value !== null) {
        wind.true.speed.knots = this.mpsToKnots(wind.true.speed.value);
      }
    },
  },

  batchUpdate(updates) {
    if (Array.isArray(updates)) {
      updates.forEach(({ path, value }) => setDeep(this, path, value));
    } else if (typeof updates === "object" && updates !== null) {
      Object.entries(updates).forEach(([path, value]) =>
        setDeep(this, path, value)
      );
    } else {
      throw new TypeError("batchUpdate expects an array or object");
    }
    return true;
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
