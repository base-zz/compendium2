import EventEmitter from 'events';
import lodash from 'lodash';
const { get, set } = lodash;

/**
 * SignalK Service Class
 * Handles communication with SignalK server via both HTTP and WebSocket
 * @extends EventEmitter
 * @emits initialized When service is fully initialized
 * @emits error When an error occurs
 * @emits full-update When complete state is updated
 * @emits [category]-update When specific category data is updated
 * @emits connection-change When WebSocket connection status changes
 */
export class SignalKService extends EventEmitter {
  /**
   * Creates a new SignalKService instance
   * @constructor
   */
  constructor() {
    super();
    this._initializeDataStructures();
    this._setupMappings();
    this._setupConnectionState();
  }

  /**
   * Discovers SignalK API endpoints by querying the server
   * @async
   * @returns {Promise<{httpUrl: string, wsUrl: string, vesselUrn: string, vesselEndpoint: Function}>}
   * @throws {Error} If endpoint discovery fails
   */
  async discoverEndpoints() {
    // Endpoint discovery logging removed
    
    try {
      const response = await fetch('http://openplotter.local:3000/signalk');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const httpUrl = data.endpoints.v1['signalk-http'];
      const wsUrl = data.endpoints.v1['signalk-ws'];
      
      console.log('[ENDPOINT] Discovered URLs:', { httpUrl, wsUrl });
      
      if (!httpUrl || !wsUrl) {
        throw new Error('SignalK URLs not discovered');
      }
      
      this.baseUrl = httpUrl;
      this.wsUrl = wsUrl;
      this._endpoints = { httpUrl, wsUrl };

      // Endpoint discovery logging removed
      const selfUrl = `${this.baseUrl}self`;
      
      const selfResponse = await fetch(selfUrl);
      if (!selfResponse.ok) throw new Error(`HTTP ${selfResponse.status}`);
      
      const selfData = await selfResponse.json();
      let vesselUrn = typeof selfData === 'string' ? selfData : selfData.self;
      if (!vesselUrn) throw new Error('No vessel URN found');
      
      // Normalize vessel URN format by removing 'vessels.' prefix if present
      if (typeof vesselUrn === 'string' && vesselUrn.startsWith('vessels.')) {
        vesselUrn = vesselUrn.substring(8);
      }

      return {
        httpUrl: this.baseUrl,
        wsUrl: this.wsUrl,
        vesselUrn,
        vesselEndpoint: (path = '') => `${this.baseUrl}vessels/${vesselUrn}/${path}`
      };
    } catch (error) {
      console.error('[ENDPOINT] Discovery failed:', error);
      throw error;
    }
  }

  /**
   * Initializes the internal data structure with default values
   * @private
   */
  _initializeDataStructures() {
    this._data = {
      vessel: {
        id: null,
        name: null,
        mmsi: null,
        length: { overall: null },
        beam: null,
        draft: { maximum: null },
        airHeight: null
      },
      navigation: {
        position: {
          latitude: null,
          longitude: null,
          timestamp: null
        },
        headingMagnetic: null,
        speedOverGround: null
      },
      meta: {
        lastUpdated: {
          vessel: null,
          navigation: null
        },
        connectionStatus: {
          websocket: false,
          polling: false,
          lastError: null
        }
      }
    };
  }

  /**
   * Sets up connection state tracking variables
   * @private
   */
  _setupConnectionState() {
    this._endpoints = null;
    this._pollingIntervals = {};
    this._wsConnection = null;
    this._isInitialized = false;
    this._retryCount = 0;
    this._maxRetries = 5;
    this._reconnectDelay = 3000;
  }

  /**
   * Configures data mappings between SignalK paths and internal structure
   * @private
   */
  _setupMappings() {
    this._mappings = [
      // Vessel information
      { source: 'name', target: 'vessel.name' },
      { source: 'mmsi', target: 'vessel.mmsi' },
      
      // Position data
      { source: 'navigation.position.latitude', target: 'navigation.position.latitude' },
      { source: 'navigation.position.longitude', target: 'navigation.position.longitude' },
      { source: 'navigation.position.timestamp', target: 'navigation.position.timestamp' },
      
      // Navigation data
      { source: 'navigation.headingMagnetic', target: 'navigation.headingMagnetic' },
      { source: 'navigation.speedOverGround', target: 'navigation.speedOverGround' },
      
      // Design properties (handle both direct and .value formats)
      { source: 'design.length.overall', target: 'vessel.length.overall' },
      { source: 'design.length.value.overall', target: 'vessel.length.overall' },
      { source: 'design.beam', target: 'vessel.beam' },
      { source: 'design.beam.value', target: 'vessel.beam' },
      { source: 'design.draft.maximum', target: 'vessel.draft.maximum' },
      { source: 'design.draft.value.maximum', target: 'vessel.draft.maximum' },
      { source: 'design.airHeight', target: 'vessel.airHeight' },
      { source: 'design.airHeight.value', target: 'vessel.airHeight' }
    ];

    // Compile mappings for efficient processing
    this._compiledMappings = this._mappings.map(mapping => ({
      ...mapping,
      normalizedSource: mapping.source.replace(/\.value/g, '')
    }));
  }

  /**
   * Initializes the service by:
   * 1. Discovering endpoints
   * 2. Fetching initial state
   * 3. Setting up polling
   * 4. Connecting WebSocket
   * @async
   * @throws {Error} If initialization fails
   */
  async initialize() {
    if (this._isInitialized) {
      console.log('[INIT] Service already initialized');
      return;
    }

    try {
      console.log('[INIT] Starting initialization');
      
      // 1. Discover endpoints
      this._endpoints = await this.discoverEndpoints();
      this._data.vessel.id = this._endpoints.vesselUrn;
      
      // 2. Fetch initial state
      await this._fetchFullState();
      
      // 3. Setup polling
      this._setupPolling({
        navigation: 5000 // Poll navigation data every 5 seconds
      });

      // 4. Connect WebSocket
      this._connectWebSocket();
      
      this._isInitialized = true;
      this.emit('initialized');
      console.log('[INIT] Service initialized successfully');
    } catch (error) {
      console.error('[INIT] Initialization failed:', error);
      this._data.meta.connectionStatus.lastError = error.message;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Fetches complete vessel state from HTTP API
   * @async
   * @private
   * @throws {Error} If fetch fails
   */
  async _fetchFullState() {
    try {
      const url = this._endpoints.vesselEndpoint();
      console.log(`[FETCH] Requesting full state from: ${url}`);
      
      const res = await fetch(url);
      // console.log(`[FETCH] Response status: ${res.status}`);
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const fullState = await res.json();
      console.log('[FETCH] Received full state data');
      this._updateFromFullState(fullState);
    } catch (error) {
      console.error('[FETCH] Failed to load full state:', error);
      throw error;
    }
  }

  /**
   * Processes complete state update from HTTP API
   * @private
   * @param {Object} fullState - Complete vessel state from SignalK
   */
  _updateFromFullState(fullState) {
    try {
      // console.log('[UPDATE] Processing full state update');
      const vesselData = fullState.vessels?.[this._endpoints.vesselUrn] || fullState;
      const now = new Date().toISOString();

      // SPECIAL HANDLING FOR VESSEL INFO
      if (vesselData.name || vesselData.mmsi) {
        try {
          if (vesselData.name) {
            this._data.vessel.name = vesselData.name;
            this._data.meta.lastUpdated.vessel = now;
            // console.log('[MAPPING] Set vessel.name to:', vesselData.name);
          }
          if (vesselData.mmsi) {
            this._data.vessel.mmsi = vesselData.mmsi;
            this._data.meta.lastUpdated.vessel = now;
            // console.log('[MAPPING] Set vessel.mmsi to:', vesselData.mmsi);
          }
        } catch (error) {
          console.error('[MAPPING] Error setting vessel info:', error);
        }
      }

      // SPECIAL HANDLING FOR DESIGN PROPERTIES
      if (vesselData.design) {
        try {
          // Length - handle both direct and .value formats
          const length = vesselData.design.length?.value?.overall ?? vesselData.design.length?.overall;
          if (length && !this._data.vessel.length.overall) { // Only set if not already set
            this._data.vessel.length.overall = length;
            // console.log('[MAPPING] Set vessel.length.overall to:', length);
          }

          // Beam - handle both formats
          const beam = vesselData.design.beam?.value ?? vesselData.design.beam;
          if (beam && !this._data.vessel.beam) {
            this._data.vessel.beam = beam;
            // console.log('[MAPPING] Set vessel.beam to:', beam);
          }

          // Draft - handle both formats
          const draftMax = vesselData.design.draft?.value?.maximum ?? vesselData.design.draft?.maximum;
          if (draftMax && !this._data.vessel.draft.maximum) {
            this._data.vessel.draft.maximum = draftMax;
            // console.log('[MAPPING] Set vessel.draft.maximum to:', draftMax);
          }

          // Air Height - handle both formats
          const airHeight = vesselData.design.airHeight?.value ?? vesselData.design.airHeight;
          if (airHeight && !this._data.vessel.airHeight) {
            this._data.vessel.airHeight = airHeight;
            // console.log('[MAPPING] Set vessel.airHeight to:', airHeight);
          }
        } catch (error) {
          console.error('[MAPPING] Error setting design properties:', error);
        }
      }

      // Process all other mappings
      this._compiledMappings.forEach(mapping => {
        try {
          // Try both the direct path and the .value path
          const value = get(vesselData, mapping.source) || 
                       get(vesselData, mapping.source.replace(/\.value/g, ''));
          
          if (value !== undefined && value !== null) {
            set(this._data, mapping.target, value);
            if (mapping.target.includes('position')) {
              console.log('[POSITION] Mapping update:', 
                `Path: ${mapping.target}`,
                `Value: ${JSON.stringify(value)}`);
            }
            // console.log(`[MAPPING] Set ${mapping.target} to:`, value);
            
            // Update timestamp for the category
            const category = mapping.target.split('.')[0];
            if (this._data.meta.lastUpdated[category]) {
              this._data.meta.lastUpdated[category] = now;
            }
          }
        } catch (error) {
          console.error(`[MAPPING] Error processing ${mapping.source}:`, error);
        }
      });

      this.emit('full-update', this._data);
      // console.log('[UPDATE] State updated successfully');
    } catch (error) {
      console.error('[UPDATE] Failed to process full state:', error);
      throw error;
    }
  }

  /**
   * Sets up polling intervals for specified categories
   * @private
   * @param {Object} intervals - Key-value pairs of category and interval in ms
   */
  _setupPolling(intervals) {
    console.log('[POLLING] Setting up polling intervals');
    this.cleanupPolling();
    
    this._pollingIntervals = {
      navigation: setInterval(() => {
        this._fetchAndMapData('navigation').catch(error => {
          console.error('[POLLING] Error during navigation poll:', error);
        });
      }, intervals.navigation)
    };
    
    this._data.meta.connectionStatus.polling = true;
  }

  /**
   * Cleans up all active polling intervals
   * @private
   */
  cleanupPolling() {
    console.log('[POLLING] Cleaning up intervals');
    Object.values(this._pollingIntervals).forEach(clearInterval);
    this._pollingIntervals = {};
    this._data.meta.connectionStatus.polling = false;
  }

  /**
   * Fetches and maps data for a specific category
   * @async
   * @private
   * @param {string} category - The data category to fetch
   * @throws {Error} If fetch or processing fails
   */
  async _fetchAndMapData(category) {
    try {
      const url = this._endpoints.vesselEndpoint(category);
      // console.log(`[POLL] Fetching ${category} data from: ${url}`);
      
      const res = await fetch(url);
      // console.log(`[POLL] Response status: ${res.status}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`[POLL] Endpoint not found: ${url}`);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      // console.log(`[POLL] Received ${category} data`);
      
      const sourceData = data.vessels?.[this._endpoints.vesselUrn]?.[category] || data[category] || data;
      
      // Apply all mappings for this category
      this._compiledMappings
        .filter(mapping => mapping.source.startsWith(`${category}.`))
        .forEach(mapping => {
          this._applyMapping(
            mapping.source, 
            get(sourceData, mapping.source.replace(/\.value/g, '')),
            new Date().toISOString()
          );
        });
      
      this._data.meta.lastUpdated[category] = new Date().toISOString();
      this.emit(`${category}-update`, this._data[category]);
    } catch (error) {
      console.error(`[POLL] Error fetching ${category} data:`, error);
      throw error;
    }
  }

  /**
   * Establishes WebSocket connection to SignalK server
   * @private
   */
  _scheduleReconnect() {
    if (this._retryCount < this._maxRetries) {
      this._retryCount++;
      const delay = Math.min(this._reconnectDelay * Math.pow(2, this._retryCount), 30000);
      console.log(`[WS] Will reconnect in ${delay}ms (attempt ${this._retryCount}/${this._maxRetries})`);
      setTimeout(() => this._connectWebSocket(), delay);
    }
  }

  _connectWebSocket() {
    // Don't attempt to reconnect if we're already in the process of connecting
    if (this._isConnecting) {
      return;
    }
    
    this._isConnecting = true;
    
    if (!this._endpoints) {
      console.error('[WS] Endpoints not initialized');
      this._isConnecting = false;
      return;
    }
    
    const wsUrl = this.wsUrl;
    if (!wsUrl || !wsUrl.startsWith('ws://')) {
      console.error('[WS] Invalid WebSocket URL');
      this._isConnecting = false;
      return;
    }
    
    // Clean up existing connection if any
    if (this._wsConnection) {
      try {
        // Only close if not already closed
        if (this._wsConnection.readyState !== WebSocket.CLOSED) {
          this._wsConnection.close();
        }
      } catch (e) {
        // Ignore errors during close
      }
      this._wsConnection = null;
    }
    
    // Clear any existing timeout
    if (this._connectionTimeout) {
      clearTimeout(this._connectionTimeout);
      this._connectionTimeout = null;
    }
    
    console.log('[WS] Connecting to SignalK server');
    this._wsConnection = new WebSocket(wsUrl, 'signalk-ws');
    this._wsConnection.binaryType = 'arraybuffer';
    this._data.meta.connectionStatus.websocket = 'connecting';
    
    // Set connection timeout
    this._connectionTimeout = setTimeout(() => {
      if (this._wsConnection && this._wsConnection.readyState !== WebSocket.OPEN) {
        console.warn('[WS] Connection timeout');
        this._wsConnection.close();
      }
    }, 10000); // 10 second timeout
    

    
    this._wsConnection.onerror = (error) => {
      console.error('[WS] Connection error');
      this._data.meta.connectionStatus.websocket = 'error';
      this._data.meta.connectionStatus.lastError = error.message || 'Unknown WebSocket error';
      // Don't reconnect here - let onclose handle it
    };

    this._wsConnection.onopen = () => {
      // Clear connection timeout
      if (this._connectionTimeout) {
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = null;
      }
      
      // Reset connection flags
      this._isConnecting = false;
      this._retryCount = 0;
      
      // Update status
      console.log('[WS] Connection established');
      this._data.meta.connectionStatus.websocket = true;
      this.emit('connection-change', { websocket: true });
      
      // Set a ping interval to keep the connection alive
      this._pingInterval = setInterval(() => {
        if (this._wsConnection && this._wsConnection.readyState === WebSocket.OPEN) {
          try {
            // Send a ping message to keep the connection alive
            this._wsConnection.send(JSON.stringify({ type: 'ping' }));
          } catch (err) {
            // If sending fails, close and reconnect
            this._wsConnection.close();
          }
        }
      }, 30000); // Send ping every 30 seconds
      
      // Subscribe to vessel updates
      try {
        const subscriptionMsg = JSON.stringify({
          context: 'vessels.self',
          subscribe: [{
            path: '*',
            period: 1000,
            format: 'delta',
            policy: 'instant'
          }]
        });
        this._wsConnection.send(subscriptionMsg);
      } catch (err) {
        console.error('[WS] Failed to send subscription');
      }
    };

    this._wsConnection.onmessage = (event) => {
      try {
        const delta = JSON.parse(event.data);
        this._processDelta(delta);
      } catch (error) {
        if (this.debug) console.error('[WS] Error processing message');
      }
    };

    this._wsConnection.onclose = (event) => {
      // Clear any existing timers
      if (this._connectionTimeout) {
        clearTimeout(this._connectionTimeout);
        this._connectionTimeout = null;
      }
      
      if (this._pingInterval) {
        clearInterval(this._pingInterval);
        this._pingInterval = null;
      }
      
      // Reset connection flag to allow reconnection attempts
      this._isConnecting = false;
      
      // Update connection status
      this._data.meta.connectionStatus.websocket = false;
      this.emit('connection-change', { websocket: false });
      
      // Log connection close - only on first disconnect or in debug mode
      if (this._retryCount === 0 || this.debug) {
        console.log('[WS] Connection closed - ' + (event.wasClean ? 'clean disconnect' : 'connection lost'));
      }
      
      // Don't reset position data on disconnect to maintain last known position
      // Don't attempt to reconnect if this was a normal closure
      if (event.code === 1000 || event.code === 1001) {
        // Normal closure or going away - don't reconnect
        this._retryCount = 0;
        return;
      }
      
      // Handle reconnection with exponential backoff
      if (this._retryCount < this._maxRetries) {
        this._retryCount++;
        
        // Calculate delay with exponential backoff and jitter
        const baseDelay = this._reconnectDelay * Math.pow(1.5, this._retryCount - 1);
        const jitter = Math.random() * 1000; // Add up to 1s of jitter to prevent thundering herd
        const delay = Math.min(baseDelay + jitter, 30000); // Max 30 second delay
        
        // Only log first and last reconnect attempts to reduce noise
        if (this._retryCount === 1 || this._retryCount === this._maxRetries) {
          console.log(`[WS] Will reconnect in ${Math.round(delay/1000)}s (attempt ${this._retryCount}/${this._maxRetries})`);
        }
        
        // Schedule reconnection
        setTimeout(() => this._connectWebSocket(), delay);
      } else {
        console.warn('[WS] Max reconnection attempts reached - please check server status');
      }
    };
  }

  /**
   * Processes WebSocket delta updates from SignalK server
   * @private
   * @param {Object} delta - Delta update object from SignalK
   */
  _processDelta(delta) {
    if (!delta.updates) {
      if (this.debug) console.log('[DELTA] No updates in delta');
      return;
    }

    const now = new Date().toISOString();
    console.log(`[DELTA] Processing ${delta.updates.length} update(s)`);
    
    delta.updates.forEach(update => {
      update.values?.forEach(value => {
        try {
          if (value.path === 'navigation.position' && value.value) {
            // Validate position coordinates
            if (typeof value.value.latitude !== 'number' || 
                typeof value.value.longitude !== 'number' ||
                Math.abs(value.value.latitude) > 90 ||
                Math.abs(value.value.longitude) > 180) {
              return;
            }
          }
          // console.log(`[DELTA] Processing ${value.path}`);
          
          // Handle object values (like position)
          if (typeof value.value === 'object' && value.value !== null) {
            Object.entries(value.value).forEach(([key, val]) => {
              const nestedPath = `${value.path}.${key}`;
              this._applyMapping(nestedPath, val, now);
            });
          } 
          // Handle simple values
          else {
            this._applyMapping(value.path, value.value, now);
          }
        } catch (error) {
          console.error(`[DELTA] Error processing ${value.path}:`, error);
        }
      });
    });
  }

  /**
   * Applies a single mapping from source path to target path
   * @private
   * @param {string} sourcePath - Source path from SignalK
   * @param {any} value - Value to set
   * @param {string} timestamp - ISO timestamp for the update
   */
  _applyMapping(sourcePath, value, timestamp) {
    // Find all mappings that match this path
    const mappings = this._compiledMappings.filter(mapping => 
      sourcePath === mapping.normalizedSource || 
      sourcePath === mapping.source
    );

    // Apply all matching mappings
    mappings.forEach(mapping => {
      try {
        if (value !== undefined && value !== null) {
          set(this._data, mapping.target, value);
          // console.log(`[MAPPING] Set ${mapping.target} to:`, value);
          
          // Update the lastUpdated timestamp for the category
          const category = mapping.target.split('.')[0];
          if (this._data.meta.lastUpdated[category]) {
            this._data.meta.lastUpdated[category] = timestamp;
          }
        }
      } catch (error) {
        console.error(`[MAPPING] Error setting ${mapping.target}:`, error);
      }
    });
  }

  /**
   * Gets current vessel position
   * @returns {Object} Position object with:
   *   - latitude: Number
   *   - longitude: Number
   *   - timestamp: ISO string
   */
  getPosition() {
    // Return null if position data isn't valid
    if (!this._data.navigation.position || 
        !this._data.navigation.position.latitude ||
        !this._data.navigation.position.longitude) {
      return null;
    }
    if (!this._data.navigation.position) {
      console.error('[POSITION] Missing navigation position structure');
      return {latitude: 0, longitude: 0, timestamp: null};
    }
    const position = this._data.navigation.position;
    console.log('[POSITION] Current position:', 
      `Lat: ${position.latitude}`, 
      `Lon: ${position.longitude}`,
      `Time: ${position.timestamp}`,
      `Valid: ${position.latitude !== 0 && position.longitude !== 0}`);
    return position;
  }

  /**
   * Gets complete current state snapshot
   * @returns {Object} Deep clone of current state
   * @throws {Error} If serialization fails
   */
  getSnapshot() {
    try {
      const snapshot = JSON.parse(JSON.stringify(this._data));
      console.log('[SNAPSHOT] Current state:', snapshot);
      return snapshot;
    } catch (error) {
      console.error('[SNAPSHOT] Error creating snapshot:', error);
      throw error;
    }
  }

  /**
   * Cleans up resources (intervals, WebSocket)
   */
  cleanup() {
    console.log('[CLEANUP] Starting cleanup');
    this.cleanupPolling();
    if (this._wsConnection) {
      console.log('[CLEANUP] Closing WebSocket');
      this._wsConnection.close();
      this._wsConnection = null;
    }
    this.removeAllListeners();
    this._isInitialized = false;
  }
}

// Singleton instance of SignalKService
export const signalKService = new SignalKService();