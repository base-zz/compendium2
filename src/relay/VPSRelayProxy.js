import { WebSocket, WebSocketServer } from 'ws';
import EventEmitter from 'events';
import crypto from 'crypto';
import MockDataGenerator from './MockDataGenerator.js';

export default class VPSRelayProxy extends EventEmitter {
  static EVENTS = {
    RELAY: {
      CONNECTED: 'relay-connected',
      DISCONNECTED: 'relay-disconnected',
      ERROR: 'relay-error',
      DATA: 'relay-data'
    },
    CLIENT: {
      CONNECTED: 'client-connected',
      DISCONNECTED: 'client-disconnected',
      ERROR: 'client-error',
      MESSAGE: 'client-message'
    },
    SHUTDOWN: {
      STARTED: 'shutdown-started',
      COMPLETE: 'shutdown-complete',
      ERROR: 'shutdown-error'
    },
    INIT: {
      COMPLETE: 'init-complete',
      FAILED: 'init-failed'
    }
  };

  constructor(config = {}) {
    super();
    
    // Required configurations (will throw if missing)
    this.config = {
      clientPort: this._getRequiredConfig('VPS_PORT', config.clientPort),
      tokenSecret: this._getRequiredConfig('TOKEN_SECRET', config.tokenSecret),
      requireAuth: process.env.REQUIRE_AUTH === 'true',
      connectionTimeout: parseInt(process.env.CONNECTION_TIMEOUT),
      maxRetries: parseInt(process.env.MAX_RETRIES),
      mockMode: process.env.MOCK_MODE === 'true',
      fallbackToMock: process.env.FALLBACK_TO_MOCK === 'true'
    };
    
    // Initialize rest
    this.relayServerConnection = null;
    this.clientConnections = new Map();
    this.server = null;
    this.mockGenerator = null;
  }
  
  // Add this helper method
  _getRequiredConfig(envVar, configValue) {
    const value = process.env[envVar] || configValue;
    if (value === undefined || value === null) {
      throw new Error(`Missing required configuration: ${envVar}`);
    }
    return value;
  }

  // The Relay Server on the boat will connect to us, so we don't need to connect to it

  _startClientServer() {
    console.log(`[VPS-PROXY] Starting WebSocket server on port ${this.config.clientPort}`);
    this.server = new WebSocketServer({
      port: this.config.clientPort,
      host: '0.0.0.0', // Explicitly bind to all interfaces
      verifyClient: this.config.requireAuth ? this._verifyClient.bind(this) : undefined
    });
    
    console.log(`[VPS-PROXY] WebSocket server started, auth ${this.config.requireAuth ? 'enabled' : 'disabled'}`);
    
    this.server.on('listening', () => {
      console.log(`[VPS-PROXY] WebSocket server listening on port ${this.config.clientPort}`);
    });
    
    this.server.on('error', (error) => {
      console.error(`[VPS-PROXY] WebSocket server error:`, error);
    });

    this.server.on('connection', (ws, req) => {
      // Check if this is a Relay Server connection or a client connection
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      
      if (token) {
        try {
          const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString());
          
          // If this is a Relay Server connection (role: 'relay')
          if (decodedToken.payload && decodedToken.payload.role === 'relay') {
            console.log(`[VPS-PROXY] Relay Server connected from ${req.socket.remoteAddress}`);
            this.relayServerConnection = ws;
            this.emit(VPSRelayProxy.EVENTS.RELAY.CONNECTED);
            
            // Handle messages from the Relay Server
            ws.on('message', (data) => {
              try {
                console.log(`[VPS-PROXY] Received data from Relay Server`);
                console.log(`[VPS-PROXY-DEBUG] Data: ${data.toString()}`);
                
                // Forward the data to all connected clients
                this._broadcastToClients(data);
                
                // Emit the data event
                this.emit(VPSRelayProxy.EVENTS.RELAY.DATA, data);
              } catch (error) {
                console.error('[VPS-PROXY] Error processing Relay Server data:', error);
              }
            });
            
            ws.on('close', () => {
              console.log('[VPS-PROXY] Relay Server disconnected');
              this.relayServerConnection = null;
              this.emit(VPSRelayProxy.EVENTS.RELAY.DISCONNECTED);
              this._handleRelayDisconnect();
            });
            
            ws.on('error', (error) => {
              console.error('[VPS-PROXY] Relay Server connection error:', error);
              this.emit(VPSRelayProxy.EVENTS.RELAY.ERROR, error);
            });
            
            return; // Exit early, this is not a client connection
          }
        } catch (error) {
          console.error('[VPS-PROXY] Error parsing token:', error);
        }
      }
      
      // This is a client connection
      const clientId = crypto.randomUUID();
      console.log(`[VPS-PROXY] Client connected: ${clientId} from ${req.socket.remoteAddress}`);
      this.clientConnections.set(clientId, ws);
      this.emit(VPSRelayProxy.EVENTS.CLIENT.CONNECTED, clientId);

      ws.on('message', (data) => {
        this.emit(VPSRelayProxy.EVENTS.CLIENT.MESSAGE, { clientId, data });
      });

      ws.on('close', () => {
        this.clientConnections.delete(clientId);
        this.emit(VPSRelayProxy.EVENTS.CLIENT.DISCONNECTED, clientId);
      });

      ws.on('error', (error) => {
        this.emit(VPSRelayProxy.EVENTS.CLIENT.ERROR, { clientId, error });
      });
    });
  }

  _verifyClient(info, callback) {
    try {
      console.log('[VPS-PROXY] Client connection attempt from:', info.req.socket.remoteAddress);
      console.log('[VPS-PROXY] Request URL:', info.req.url);
      
      const token = new URL(info.req.url, 'http://localhost').searchParams.get('token');
      if (!token) {
        console.error('[VPS-PROXY] No token provided in connection request');
        callback(false);
        return;
      }
      
      console.log('[VPS-PROXY] Token received, validating...');
      // Implement your actual token validation here
      const isValid = this._validateToken(token);
      console.log('[VPS-PROXY] Token validation result:', isValid);
      callback(isValid);
    } catch (error) {
      console.error('[VPS-PROXY] Client verification error:', error);
      callback(false);
    }
  }

  _validateToken(token) {
    if (!process.env.TOKEN_SECRET) {
      throw new Error('TOKEN_SECRET environment variable not set');
    }    
    try {
      // Decode the base64 token
      let decodedToken;
      try {
        decodedToken = JSON.parse(Buffer.from(token, 'base64').toString());
      } catch (e) {
        console.error('[VPS-PROXY] Invalid token format:', e.message);
        return false;
      }
      
      // Check if token has the expected structure
      if (!decodedToken.payload || !decodedToken.signature) {
        console.error('[VPS-PROXY] Token missing payload or signature');
        return false;
      }
      
      // Verify the signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.TOKEN_SECRET || 'a8f3e6d9c2b5a7f1e4d8c3b6a9f2e5d8')
        .update(JSON.stringify(decodedToken.payload))
        .digest('hex');
      
      const isValid = expectedSignature === decodedToken.signature;
      
      // Check if token is expired
      const now = Date.now();
      const isExpired = decodedToken.payload.expiresAt && decodedToken.payload.expiresAt < now;
      
      if (!isValid) {
        console.error('[VPS-PROXY] Invalid token signature');
      }
      
      if (isExpired) {
        console.error('[VPS-PROXY] Token expired');
      }
      
      return isValid && !isExpired;
    } catch (error) {
      console.error('[VPS-PROXY] Token validation error:', error);
      return false;
    }
  }

  _broadcastToClients(data) {
    console.log(`[VPS-PROXY] Broadcasting data to ${this.clientConnections.size} clients`);
    let sentCount = 0;
    
    this.clientConnections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
          sentCount++;
        } catch (error) {
          console.error('[VPS-PROXY] Error sending data to client:', error);
        }
      }
    });
    
    console.log(`[VPS-PROXY] Data sent to ${sentCount} clients`);
  
  }

  _handleRelayDisconnect() {
    if (this.config.fallbackToMock && !this.config.mockMode) {
      console.log('[VPS-PROXY] Falling back to mock data mode');
      this.config.mockMode = true;
      this._startMockData();
    }
  }

  _startMockData() {
    if (!this.mockGenerator) {
      this.mockGenerator = new MockDataGenerator();
      console.log('[VPS-PROXY] Mock data generator initialized');
      
      // Subscribe to mock data updates
      this.mockGenerator.subscribe((data) => {
        try {
          this._broadcastToClients(JSON.stringify(data));
        } catch (error) {
          console.error('[VPS-PROXY] Error broadcasting mock data:', error);
        }
      });
      
      // Start the mock data generator
      this.mockGenerator.start();
      console.log('[VPS-PROXY] Mock data generation started');
    }
  }

  async initialize() {
    try {
      // Start client server first regardless of mode
      console.log('[VPS-PROXY] Starting client server to accept connections');
      this._startClientServer();
      
      // Handle mock mode
      if (this.config.mockMode) {
        console.log('[VPS-PROXY] Starting in mock mode');
        this._startMockData();
        this.emit(VPSRelayProxy.EVENTS.INIT.COMPLETE);
        return this;
      }
      
      // In the VPS Relay Proxy, we don't connect to the Relay Server
      // Instead, we just wait for connections from the Relay Server on the boat
      console.log('[VPS-PROXY] Ready to accept connections from Relay Server');
      
      // If fallback to mock is enabled and we want mock data while waiting for connections
      if (this.config.fallbackToMock === true) {
        console.log('[VPS-PROXY] Starting mock data generator as fallback');
        this.config.mockMode = true;
        this._startMockData();
      }
      
      this.emit(VPSRelayProxy.EVENTS.INIT.COMPLETE);
      return this;
    } catch (error) {
      console.error('[VPS-PROXY] Initialization failed:', error);
      this.emit(VPSRelayProxy.EVENTS.INIT.FAILED, error);
      throw error;
    }
  }

  shutdown() {
    this.emit(VPSRelayProxy.EVENTS.SHUTDOWN.STARTED);
    
    try {
      // Clear mock data interval
      if (this.mockInterval) {
        clearInterval(this.mockInterval);
        this.mockInterval = null;
      }

      // Close all client connections
      this.clientConnections.forEach((client) => {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.close(1001, 'Server shutdown');
          }
        } catch (error) {
          console.error('[VPS-PROXY] Error closing client connection:', error);
        }
      });
      this.clientConnections.clear();

      // Close relay connection
      if (this.relayServerConnection && 
          [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.relayServerConnection.readyState)) {
        this.relayServerConnection.close(1001, 'Server shutdown');
      }

      // Close server
      if (this.server) {
        this.server.close((err) => {
          if (err) console.error('[VPS-PROXY] Server close error:', err);
        });
      }
    } catch (error) {
      console.error('[VPS-PROXY] Shutdown error:', error);
      this.emit(VPSRelayProxy.EVENTS.SHUTDOWN.ERROR, error);
      throw error;
    } finally {
      this.emit(VPSRelayProxy.EVENTS.SHUTDOWN.COMPLETE);
    }
  }
}

 