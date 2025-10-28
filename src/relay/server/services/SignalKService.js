import EventEmitter from 'events';
import { signalKAdapterRegistry } from '../adapters/SignalKAdapterRegistry.js';

/**
 * SignalKService
 * 
 * Connects to a SignalK server and provides real-time data streams.
 * Uses adapters to handle different SignalK server implementations.
 */
export class SignalKService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      url: process.env.SIGNALK_URL || 'http://openplotter.local:3000/signalk',
      token: process.env.SIGNALK_TOKEN || '',
      reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '3000', 10),
      maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '10', 10),
      adapterName: process.env.SIGNALK_ADAPTER || '', // Optional explicit adapter name
      ...config
    };
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.connected = false;
    this.adapter = null; // Will be set during connection
  }
  
  /**
   * Connect to the SignalK server
   */
  async connect() {
    try {
      console.log(`[SIGNALK] Connecting to SignalK server at ${this.config.url}`);
      
      // Get server information to determine the appropriate adapter
      let serverInfo;
      try {
        const response = await fetch(`${this.config.url}`);
        serverInfo = await response.json();
        console.log('[SIGNALK] Server response:', JSON.stringify(serverInfo));
      } catch (error) {
        console.error('[SIGNALK] Error getting server info:', error);
        serverInfo = { url: this.config.url };
      }
      
      // Select the appropriate adapter
      if (this.config.adapterName) {
        // Use explicitly configured adapter if specified
        this.adapter = signalKAdapterRegistry.getAdapterByName(this.config.adapterName);
        if (!this.adapter) {
          console.warn(`[SIGNALK] Adapter "${this.config.adapterName}" not found, using auto-detection`);
        }
      }
      
      // If no adapter was explicitly set or found, auto-detect
      if (!this.adapter) {
        this.adapter = signalKAdapterRegistry.findAdapter(serverInfo);
      }
      
      console.log(`[SIGNALK] Using adapter: ${this.adapter.constructor.name}`);
      
      // Get WebSocket URL using the adapter
      let wsUrl = this.adapter.getWebSocketUrl(serverInfo, this.config.url);
      
      // If adapter couldn't determine the URL, use fallback approach
      if (!wsUrl) {
        console.warn('[SIGNALK] Adapter could not determine WebSocket URL, using fallback');
        
        if (this.config.url.includes('demo.signalk.org')) {
          wsUrl = 'wss://demo.signalk.org/signalk/v1/stream';
        } else {
          // Generic fallback
          wsUrl = `${this.config.url.replace(/\/$/, '')}/v1/stream`;
        }
      }
      
      if (!wsUrl) {
        throw new Error('Could not determine WebSocket URL');
      }
      console.log(`[SIGNALK] Connecting to WebSocket endpoint: ${wsUrl}`);
      
      // Add token if provided
      if (this.config.token) {
        wsUrl += (wsUrl.includes('?') ? '&' : '?') + `token=${this.config.token}`;
      }
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this._handleOpen.bind(this);
      this.ws.onmessage = this._handleMessage.bind(this);
      this.ws.onclose = this._handleClose.bind(this);
      this.ws.onerror = this._handleError.bind(this);
      
      return true;
    } catch (error) {
      console.error('[SIGNALK] Connection failed:', error);
      this.emit('error', error);
      
      // Try to reconnect
      this._reconnect();
      
      return false;
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  _handleOpen() {
    console.log('[SIGNALK] Connected to SignalK server');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');
    
    // Subscribe to updates using the adapter's subscription message
    this._subscribe();
  }
  
  /**
   * Handle WebSocket message event
   */
  _handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // Debug: Log the raw message from SignalK
      if (process.env.DEBUG === 'true') {
        // console.log('[SIGNALK-DEBUG] Raw message from SignalK:', JSON.stringify(message));
      }
      
      // Process the message using the adapter
      const processedData = this.adapter.processMessage(message);
      
      // Emit navigation updates if available
      if (processedData.hasNavigationData) {
        this.emit('navigation-update', processedData.navigationData);
        
        if (process.env.DEBUG === 'true') {
          // console.log('[SIGNALK-DEBUG] Emitting navigation update:', JSON.stringify(processedData.navigationData));
        }
        
        // Check for wind data in the navigation data and emit it separately
        if (processedData.navigationData.wind) {
          this.emit('environment-update', { 
            wind: processedData.navigationData.wind,
            timestamp: processedData.navigationData.timestamp
          });
          
          if (process.env.DEBUG === 'true') {
            // console.log('[SIGNALK-DEBUG] Emitting environment update (wind):', 
            //             JSON.stringify(processedData.navigationData.wind));
          }
        }
        
        // Check for depth data in the navigation data and emit it separately
        if (processedData.navigationData.depth) {
          this.emit('environment-update', { 
            depth: processedData.navigationData.depth,
            timestamp: processedData.navigationData.timestamp
          });
          
          if (process.env.DEBUG === 'true') {
            // console.log('[SIGNALK-DEBUG] Emitting environment update (depth):', 
            //             JSON.stringify(processedData.navigationData.depth));
          }
        }
      }
      
      // Emit alerts if available
      if (processedData.alerts && processedData.alerts.length > 0) {
        for (const alert of processedData.alerts) {
          this.emit('alert', alert);
        }
      }
    } catch (error) {
      console.error('[SIGNALK] Error processing message:', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  _handleClose() {
    console.log('[SIGNALK] Disconnected from SignalK server');
    this.connected = false;
    this.emit('disconnected');
    
    // Try to reconnect
    this._reconnect();
  }
  
  /**
   * Handle WebSocket error event
   */
  _handleError(error) {
    console.error('[SIGNALK] WebSocket error:', error);
    
    // Don't emit error events for connection errors as they're already handled by close event
    // This prevents unhandled error events from crashing the application
    if (this.ws && this.ws.readyState !== WebSocket.CONNECTING) {
      // Only emit non-connection errors
      this.emit('connection-error', error);
    }
    
    // Close the connection if it's still open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close();
      } catch (closeError) {
        console.error('[SIGNALK] Error closing WebSocket:', closeError);
      }
    }
  }
  
  /**
   * Try to reconnect to the SignalK server
   */
  _reconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`[SIGNALK] Max reconnect attempts (${this.config.maxReconnectAttempts}) reached`);
      this.emit('reconnect-failed');
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`[SIGNALK] Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.config.reconnectDelay);
  }
  
  /**
   * Subscribe to SignalK updates
   */
  _subscribe() {
    if (!this.connected || !this.ws) {
      return;
    }
    
    // Get subscription message from the adapter
    const subscriptionMessage = this.adapter.createSubscriptionMessage();
    
    this.ws.send(JSON.stringify(subscriptionMessage));
    console.log('[SIGNALK] Subscribed to updates');
  }
  
  /**
   * Disconnect from the SignalK server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    console.log('[SIGNALK] Disconnected from SignalK server');
  }
}

// Singleton instance
export const signalKService = new SignalKService();
