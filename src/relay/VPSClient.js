import { WebSocket } from 'ws';
import EventEmitter from 'events';
import crypto from 'crypto';

export default class VPSClient extends EventEmitter {
  static EVENTS = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    MESSAGE: 'message',
    AUTHENTICATED: 'authenticated'
  };

  constructor(config) {
    super();
    this.config = {
      vpsUrl: `ws://${process.env.VPS_HOST || 'compendiumnav.com'}:${process.env.VPS_PORT}${process.env.VPS_PATH || '/relay'}`,
      requireAuth: process.env.REQUIRE_AUTH === 'true',
      tokenSecret: process.env.TOKEN_SECRET
    };
  }
    super();
    this.config = config;
    this.connection = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
  }

  async connect() {
    try {
      console.log('🔌 Attempting to connect to VPS Relay Proxy...');
      
      // Construct the WebSocket URL
      const wsUrl = this.config.vpsUrl;
      if (!wsUrl) {
        throw new Error('❌ VPS URL not configured');
      }

      // Create WebSocket connection
      this.connection = new WebSocket(wsUrl);

      // Set up event handlers
      this.connection.on('open', () => {
        console.log('✅ Connected to VPS Relay Proxy');
        this.reconnectAttempts = 0;
        this.emit(VPSClient.EVENTS.CONNECTED);
        
        // If authentication is required, send auth token
        if (this.config.requireAuth) {
          const token = this.generateToken();
          this.connection.send(JSON.stringify({
            type: 'auth',
            token
          }));
        }
      });

      this.connection.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.emit(VPSClient.EVENTS.MESSAGE, message);
        } catch (error) {
          console.error('❌ Error parsing VPS message:', error);
        }
      });

      this.connection.on('error', (error) => {
        console.error('❌ VPS connection error:', error);
        this.emit(VPSClient.EVENTS.ERROR, error);
      });

      this.connection.on('close', (code, reason) => {
        console.log(`🔌 VPS connection closed (code: ${code}, reason: ${reason})`);
        this.emit(VPSClient.EVENTS.DISCONNECTED);
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        } else {
          console.error('❌ Maximum reconnect attempts exceeded');
        }
      });

    } catch (error) {
      console.error('❌ Failed to connect to VPS:', error);
      this.emit(VPSClient.EVENTS.ERROR, error);
      
      // Attempt to reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    }
  }

  generateToken() {
    if (!this.config.tokenSecret) {
      throw new Error('❌ Token secret not configured');
    }
    
    // Create the token payload
    const payload = {
      id: 'relay-server',
      role: 'relay',
      exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours from now
    };
    
    // Create the token signature
    const hmac = crypto.createHmac('sha256', this.config.tokenSecret);
    hmac.update(JSON.stringify(payload));
    const signature = hmac.digest('hex');
    
    // Create the final token with the signature
    const token = {
      payload,
      signature
    };
    
    // Return the token as a base64 encoded string
    return Buffer.from(JSON.stringify(token)).toString('base64');
  }

  send(data) {
    if (!this.connection || this.connection.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send data - not connected to VPS');
      return false;
    }
    
    try {
      this.connection.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('❌ Error sending data to VPS:', error);
      return false;
    }
  }

  close() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
}
