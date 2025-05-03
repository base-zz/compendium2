/**
 * StateService
 *
 * This service connects to SignalK and other data sources to maintain
 * the unified StateData. It handles the connection, data mapping,
 * and synchronization with the relay system.
 */

import WebSocket from "ws";
import EventEmitter from "events";
import { stateData } from "./StateData.js";
import { signalKAdapterRegistry } from "../../relay/server/adapters/SignalKAdapterRegistry.js";
import fetch from "node-fetch";
import { extractAISTargetsFromSignalK } from "./extractAISTargets.js";
import pkg from "fast-json-patch";
import { stateManager } from "../../relay/core/state/StateManager.js";

const { compare: jsonPatchCompare } = pkg;

class StateService extends EventEmitter {
  _debug(...args) {
    // console.debug('[StateService]', ...args);
  }

  constructor() {
    super();
    console.log("[StateService] Constructed StateService instance");
    this.config = null;
    this.signalKAdapter = null;
    this.signalKWsUrl = null;
    this.selfMmsi = null;

    // Connection state
    this.connections = {
      signalK: {
        socket: null,
        connected: false,
        reconnectAttempts: 0,
        lastMessage: null,
      },
    };

    this.hasLoggedFirstData = false;
    this.sources = new Map();
    this.updateQueue = new Map();
    this.updateTimer = null;
    this._aisRefreshTimer = null;
    this._lastFullEmit = 0;

    this.EVENTS = {
      CONNECTED: "connected",
      DISCONNECTED: "disconnected",
      ERROR: "error",
      DATA_RECEIVED: "data:received",
      STATE_UPDATED: "state:updated",
      SOURCE_ADDED: "source:added",
      SOURCE_REMOVED: "source:removed",
      STATE_FULL_UPDATE: "state:full-update",
      STATE_PATCH: "state:patch",
    };
  }

  async initialize(config = {}) {
    console.log("[StateService] Initializing with config:", config);
    const isNodeEnv = typeof process !== "undefined" && process.env;

    const signalKBaseUrl =
      config.signalKBaseUrl ||
      (isNodeEnv ? process.env.SIGNALK_URL : undefined);
    const reconnectDelay =
      config.reconnectDelay ||
      (isNodeEnv ? process.env.RECONNECT_DELAY : undefined);
    const maxReconnectAttempts =
      config.maxReconnectAttempts ||
      (isNodeEnv ? process.env.MAX_RECONNECT_ATTEMPTS : undefined);
    const updateInterval = config.updateInterval || process.env.UPDATE_INTERVAL;

    if (
      !signalKBaseUrl ||
      !reconnectDelay ||
      !maxReconnectAttempts ||
      !updateInterval
    ) {
      throw new Error("Missing required configuration parameters");
    }

    this.config = {
      signalKBaseUrl,
      signalKToken: config.signalKToken || process.env.SIGNALK_TOKEN || null,
      reconnectDelay: parseInt(reconnectDelay, 10),
      maxReconnectAttempts: parseInt(maxReconnectAttempts, 10),
      updateInterval: parseInt(updateInterval, 10),
      debug:
        config.debug !== undefined
          ? config.debug
          : process.env.DEBUG === "true",
      ...config,
    };

    this._setupBatchProcessing();
    await this._discoverSignalKServer();
    await this._connectToSignalK();

    try {
      const vesselsUrl = `${this.config.signalKBaseUrl.replace(
        /\/$/,
        ""
      )}/v1/api/vessels`;
      const selfUrl = `${this.config.signalKBaseUrl.replace(
        /\/$/,
        ""
      )}/v1/api/self`;
      const headers = this.config.signalKToken
        ? { Authorization: `Bearer ${this.config.signalKToken}` }
        : {};

      const [vesselsResponse, selfResponse] = await Promise.all([
        fetch(vesselsUrl, { headers }),
        fetch(selfUrl, { headers }),
      ]);

      if (vesselsResponse.ok && selfResponse.ok) {
        const [vesselsData, selfData] = await Promise.all([
          vesselsResponse.json(),
          selfResponse.json(),
        ]);

        this.selfMmsi = selfData?.replace("vessels.", "");
        const aisTargets = extractAISTargetsFromSignalK(
          vesselsData,
          this.selfMmsi
        );
        stateData.anchor.aisTargets = aisTargets;

        this.startAISPeriodicRefresh(async () => {
          const url = `${this.config.signalKBaseUrl.replace(
            /\/$/,
            ""
          )}/v1/api/vessels`;
          const response = await fetch(url, { headers });
          if (!response.ok)
            throw new Error(`Failed to fetch /vessels: ${response.status}`);
          return { vessels: await response.json() };
        }, 10000);
      }
    } catch (err) {
      console.warn("[StateService] Error fetching initial data:", err);
    }

    this._debug("StateService initialized");
    return this;
  }

  async updateAISTargetsFromSignalK(fullSignalKData) {
    const aisTargets = extractAISTargetsFromSignalK(
      fullSignalKData.vessels,
      this.selfMmsi
    );
    stateData.anchor.aisTargets = aisTargets;
  }

  startAISPeriodicRefresh(fetchSignalKFullState, intervalMs = 10000) {
    if (this._aisRefreshTimer) clearInterval(this._aisRefreshTimer);
    this._aisRefreshTimer = setInterval(async () => {
      try {
        const fullSignalKData = await fetchSignalKFullState();
        await this.updateAISTargetsFromSignalK(fullSignalKData);
      } catch (err) {
        this._debug("AIS periodic refresh error:", err);
      }
    }, intervalMs);
  }

  stopAISPeriodicRefresh() {
    if (this._aisRefreshTimer) clearInterval(this._aisRefreshTimer);
    this._aisRefreshTimer = null;
  }

  async _discoverSignalKServer() {
    const infoUrl = this.config.signalKBaseUrl;
    const headers = this.config.signalKToken
      ? { Authorization: `Bearer ${this.config.signalKToken}` }
      : {};

    const response = await fetch(infoUrl, { headers });
    if (!response.ok) {
      throw new Error(
        `Failed to fetch SignalK server info: ${response.status} ${response.statusText}`
      );
    }

    const discoveryJson = await response.json();
    const wsUrl = discoveryJson?.endpoints?.v1?.["signalk-ws"];

    if (!wsUrl || typeof wsUrl !== "string" || !wsUrl.startsWith("ws")) {
      throw new Error(
        "SignalK WebSocket URL (signalk-ws) not found in discovery JSON."
      );
    }

    this.signalKWsUrl = wsUrl;
    this.signalKAdapter = signalKAdapterRegistry.findAdapter
      ? signalKAdapterRegistry.findAdapter(discoveryJson)
      : null;
  }

  async _connectToSignalK() {
    return new Promise((resolve, reject) => {
      let url = this.signalKWsUrl;
      if (this.config.signalKToken) {
        url += `?token=${this.config.signalKToken}`;
      }

      const socket = new WebSocket(url);
      this.connections.signalK.socket = socket;

      socket.on("open", () => {
        this._debug("Connected to SignalK");
        this.connections.signalK.connected = true;
        this.connections.signalK.reconnectAttempts = 0;

        socket.send(
          JSON.stringify({
            context: "*",
            subscribe: [
              {
                path: "*",
                period: this.config.updateInterval || 1000,
              },
            ],
          })
        );

        this.emit(this.EVENTS.CONNECTED, { source: "signalK" });
        resolve();
      });

      socket.on("message", (data) => {
        this._handleSignalKMessage(data);
      });

      socket.on("error", (error) => {
        this._debug(`SignalK connection error: ${error.message}`);
        this.emit(this.EVENTS.ERROR, {
          source: "signalK",
          error,
          message: error.message,
        });
      });

      socket.on("close", () => {
        this._debug("Disconnected from SignalK");
        this.connections.signalK.connected = false;
        this.emit(this.EVENTS.DISCONNECTED, { source: "signalK" });
        this._reconnectToSignalK();
      });
    });
  }

  _reconnectToSignalK() {
    if (
      this.connections.signalK.reconnectAttempts >=
      this.config.maxReconnectAttempts
    ) {
      this._debug("Max reconnect attempts reached, giving up");
      this.emit(this.EVENTS.ERROR, {
        source: "signalK",
        message: "Max reconnect attempts reached",
      });
      return;
    }

    this.connections.signalK.reconnectAttempts++;
    this._debug(
      `Reconnecting to SignalK (attempt ${this.connections.signalK.reconnectAttempts}/${this.config.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this._connectToSignalK().catch(() => {});
    }, this.config.reconnectDelay);
  }

  async _handleSignalKMessage(data) {
    try {
      const message = JSON.parse(data);
      this.connections.signalK.lastMessage = Date.now();

      if (message.updates) {
        await this._processSignalKDelta(message);
      }
      this.emit(this.EVENTS.DATA_RECEIVED, {
        source: "signalK",
        timestamp: Date.now(),
      });
    } catch (error) {
      this._debug(`Error processing SignalK message: ${error.message}`);
      this.emit(this.EVENTS.ERROR, {
        source: "signalK",
        error,
        message: error.message,
        data,
      });
    }
  }

  async _processSignalKDelta(delta) {
    if (!delta.updates || !Array.isArray(delta.updates)) return;

    let processedData = delta;
    if (this.signalKAdapter?.processMessage) {
      processedData = this.signalKAdapter.processMessage(delta);
    }

    if (!processedData.updates) return;

    for (const update of processedData.updates) {
      if (!Array.isArray(update.values)) continue;

      const source =
        update.$source || (update.source && update.source.label) || "unknown";

      for (const value of update.values) {
        if (!value.path) continue;

        this._processSignalKValue(value.path, value.value, source);
      }
    }
  }

  _processSignalKValue(path, value, source) {
    // Log all incoming updates
    // console.log("[DEBUG] Incoming SignalK update:", path, value);

    // First check special transforms
    if (this._applySpecialTransform(path, value)) {
      return;
    }

    // Then check direct mappings
    const mapping = this._getCanonicalMapping(path);
    if (mapping) {
      const transformedValue = mapping.transform ? mapping.transform(value) : value;
      this._queueUpdate(mapping.path, transformedValue, source);

      // console.log(
      //   "[DEBUG] Mapping found for",
      //   path,
      //   "->",
      //   mapping.path,
      //   "Transformed value:",
      //   transformedValue
      // );

      return;
    }

    // Fallback to generic mapping
    // const fallbackPath = `external.signalK.${path.replace(/\./g, "_")}`;
    // this._queueUpdate(fallbackPath, value, source);
    // console.log("[DEBUG] Queued fallback update:", fallbackPath, value, source);
  }

  _applySpecialTransform(path, value) {
    const transform = this._getSpecialTransform(path);
    if (transform) {
      transform(value, stateData);
      return true;
    }
    return false;
  }

  _getSpecialTransform(path) {
    // Special transforms take priority
    const specialTransforms = {
      "navigation.headingMagnetic": (value, state) => {
        state.navigation.course.heading.magnetic.value = value;
        if (state.navigation.course.variation.value !== null) {
          state.navigation.course.heading.true.value =
            value + state.navigation.course.variation.value;
        }
      },
      "environment.wind.angleApparent": (value, state) => {
        state.navigation.wind.apparent.angle.value = value;
        if (state.navigation.course.heading.true.value !== null) {
          state.navigation.wind.apparent.direction.value =
            state.navigation.course.heading.true.value + value;
        }
      },
    };

    return specialTransforms[path];
  }

  _getCanonicalMapping(path) {
    const signalKToCanonicalMappings = {
      "navigation.position": {
        path: "navigation.position",
        transform: (skObj) => ({
          latitude: { value: skObj.latitude ?? null, units: "deg" },
          longitude: { value: skObj.longitude ?? null, units: "deg" },
          timestamp: new Date().toISOString(),
        }),
      },
      // Course Data
      "navigation.courseOverGroundTrue": {
        path: "navigation.course.cog.value",
      },
      "navigation.headingMagnetic": {
        path: "navigation.course.heading.magnetic.value",
      },
      "navigation.magneticVariation": {
        path: "navigation.course.variation.value",
      },
      "navigation.rateOfTurn": { path: "navigation.course.rateOfTurn.value" },
      "navigation.courseRhumbline.bearingTrackTrue": {
        path: "navigation.course.cog.value"
      },  

      // Speed Data
      "navigation.speedOverGround": { path: "navigation.speed.sog.value" },
      "navigation.speedThroughWater": { path: "navigation.speed.stw.value" },

      // Trip Data
      "navigation.trip.log": { path: "navigation.trip.log.value" },

      // Depth Data
      "environment.depth.belowTransducer": {
        path: "navigation.depth.belowTransducer.value",
      },

      // Wind Data
      "environment.wind.speedApparent": {
        path: "navigation.wind.apparent.speed.value",
      },
      "environment.wind.angleApparent": {
        path: "navigation.wind.apparent.angle.value",
      },
      "environment.wind.directionApparent": {
        path: "navigation.wind.apparent.direction.value",
      },

      // Environment Data
      "environment.outside.pressure": {
        path: "environment.weather.pressure.value",
      },
      "environment.outside.temperature": {
        path: "environment.weather.temperature.air.value",
      },
      "environment.water.temperature": {
        path: "environment.weather.temperature.water.value",
      },
      "environment.outside.humidity": {
        path: "environment.weather.humidity.value",
      },

      // Vessel Info
      mmsi: { path: "vessel.info.mmsi" },
      "vessel.name": { path: "vessel.info.name" },
      "vessel.callsignVhf": { path: "vessel.info.callsign" },
      "vessel.design.type": { path: "vessel.info.type" },
      "vessel.design.length": { path: "vessel.info.dimensions.length.value" },
      "vessel.design.beam": { path: "vessel.info.dimensions.beam.value" },
      "vessel.design.draft": { path: "vessel.info.dimensions.draft.value" },

      // Electrical Systems
      "electrical.batteries.voltage": {
        path: "vessel.systems.electrical.batteries.voltage.value",
      },
      "electrical.batteries.current": {
        path: "vessel.systems.electrical.batteries.current.value",
      },

      // Propulsion (with wildcard support)
      propulsion: {
        path: "vessel.systems.propulsion.engines",
        transform: (value, path) => {
          // Handle wildcard paths like propulsion.0.revolutions
          const parts = path.split(".");
          if (parts.length > 1 && !isNaN(parts[1])) {
            const index = parseInt(parts[1]);
            return { [index]: { [parts[2]]: value } };
          }
          return value;
        },
      },
      "tanks.fuel.currentLevel": {
        path: "vessel.systems.propulsion.fuel.level.value",
      },
      "tanks.fuel.rate": { path: "vessel.systems.propulsion.fuel.rate.value" },

      // Tanks
      "tanks.freshWater.currentLevel": {
        path: "vessel.systems.tanks.freshWater.value",
      },
      "tanks.wasteWater.currentLevel": {
        path: "vessel.systems.tanks.wasteWater.value",
      },
      "tanks.blackWater.currentLevel": {
        path: "vessel.systems.tanks.blackWater.value",
      },

      // Anchor Data
      "navigation.anchor.position": {
        path: "anchor.anchorLocation.position",
        transform: (value) => ({
          latitude: { value: value.latitude, units: "deg" },
          longitude: { value: value.longitude, units: "deg" },
        }),
      },
      "navigation.anchor.maxRadius": {
        path: "anchor.watchCircle.radius.value",
      },
    };

    // Check for exact match first
    if (signalKToCanonicalMappings[path]) {
      return signalKToCanonicalMappings[path];
    }

    // Check for wildcard matches (like propulsion.0.revolutions)
    for (const [skPath, mapping] of Object.entries(
      signalKToCanonicalMappings
    )) {
      if (skPath.includes("*")) {
        const regex = new RegExp(
          "^" + skPath.replace(".", "\\.").replace("*", "\\d+") + "$"
        );
        if (regex.test(path)) {
          return {
            ...mapping,
            transform: (value) =>
              mapping.transform ? mapping.transform(value, path) : value,
          };
        }
      }
    }

    return null;
  }

  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  _queueUpdate(path, value, source) {
    this.updateQueue.set(path, { value, source });
    if (value !== null && value !== undefined && !this.hasLoggedFirstData) {
      console.log(
        `[StateService] RECEIVED FIRST DATA from SignalK: ${path} =`,
        value
      );
      this.hasLoggedFirstData = true;
    }
  }

  _setupBatchProcessing() {
    if (this.updateTimer) clearInterval(this.updateTimer);
    this.updateTimer = setInterval(() => {
      this._processBatchUpdates();
    }, this.config.updateInterval);
  }

  
  _processBatchUpdates() {
    if (this.updateQueue.size === 0) return;
  
    // console.log('[StateService] Processing batch updates'); // DEBUG

    const updates = [];
    const patches = [];
    const currentState = stateData.state;
  
    this.updateQueue.forEach(({value, source}, path) => {
      // Skip external paths that aren't mapped to our canonical state
      if (path.startsWith('external.')) {
        console.debug(`[StateService] Skipping unmapped external path: ${path}`);
        return;
      }
  
      try {
        updates.push({ path, value });
        
        const currentValue = this._getValueByPath(currentState, path);
        if (!this._deepEqual(currentValue, value)) {
          patches.push({
            op: 'replace',
            path: `/${path.replace(/\./g, '/')}`,
            value: value
          });
        }
      } catch (error) {
        console.warn(`[StateService] Failed to process update for ${path}:`, error);
      }
    });
  
    this.updateQueue.clear();
    // console.log('[StateService] After updateQueue clear'); // DEBUG

    if (updates.length > 0) {
      try {
        // Apply updates to stateData
        stateData.batchUpdate(updates);
        
        // Apply patches to stateManager
        if (patches.length > 0) {
          stateManager.applyPatchAndForward(patches);
        }
        
        // Update derived values
        stateData.convert.updateAllDerivedValues();
  
        // console.log("[StateService] After stateData.convert.updateAllDefivedValues", JSON.stringify(stateData, null, 2));
      
        // const payload = {
        //   updates,
        //   patches,
        //   timestamp: Date.now()
        // };
        // console.log("[StateService] Emitting STATE_UPDATED event: ", payload);

        this.emit(this.EVENTS.STATE_PATCH, {
          type: "state:patch",
          data: patches,
          source: "signalK",
          timestamp: Date.now(),
        });

        if (!this._lastFullEmit || Date.now() - this._lastFullEmit > 30000) {
          this.emit(this.EVENTS.STATE_FULL_UPDATE, {
            type: "state:full-update",
            data: stateData.state,
            source: "signalK",
            timestamp: Date.now(),
          });
          this._lastFullEmit = Date.now();
        }

      } catch (error) {
        console.error('[StateService] Error applying updates:', error);
      }
    }
  }

  // Helper methods
  _getValueByPath(obj, path) {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }
  
  _deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }


  registerExternalSource(sourceId, initialData = {}, updateHandler = null) {
    try {
      const success = stateData.addExternalSource(sourceId, initialData);
      if (success && updateHandler) {
        this.sources.set(sourceId, { updateHandler });
      }
      this.emit(this.EVENTS.SOURCE_ADDED, { sourceId, timestamp: Date.now() });
      return success;
    } catch (error) {
      this._debug(`Failed to register external source: ${error.message}`);
      this.emit(this.EVENTS.ERROR, {
        source: "stateService",
        error,
        message: `Failed to register external source: ${sourceId}`,
      });
    }
  }

  shutdown() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    if (this._aisRefreshTimer) {
      clearInterval(this._aisRefreshTimer);
      this._aisRefreshTimer = null;
    }
    if (this.connections.signalK.socket) {
      this.connections.signalK.socket.close();
    }
    return true;
  }

  removeExternalSource(sourceId) {
    try {
      const success = stateData.removeExternalSource(sourceId);
      if (success) {
        this.sources.delete(sourceId);
        this.emit(this.EVENTS.SOURCE_REMOVED, {
          sourceId,
          timestamp: Date.now(),
        });
      }
      return success;
    } catch (error) {
      this._debug(`Failed to remove external source: ${error.message}`);
      this.emit(this.EVENTS.ERROR, {
        source: "stateService",
        error,
        message: `Failed to remove external source: ${sourceId}`,
      });
      return false;
    }
  }
}

// Create singleton instance
const stateService = new StateService();

// Utility function for fetching full SignalK state
async function fetchSignalKFullState(signalKBaseUrl, signalKToken) {
  const url = `${signalKBaseUrl}/vessels`;
  const headers = signalKToken
    ? { Authorization: `Bearer ${signalKToken}` }
    : {};
  const response = await fetch(url, { headers });
  if (!response.ok)
    throw new Error(`Failed to fetch /vessels: ${response.status}`);
  return { vessels: await response.json() };
}

export { stateService, StateService, fetchSignalKFullState };
