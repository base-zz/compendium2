#!/usr/bin/env node
import VPSRelayProxy from './VPSRelayProxy.js';
import VPSClient from './VPSClient.js';
import http from 'http';
import process from 'process';

// Configuration constants
const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'];

class Application {
  constructor() {
    this.config = this._loadConfig();
    this.proxy = new VPSRelayProxy();
    this.vpsClient = new VPSClient(this.config);
    this.server = http.createServer(this.healthCheckHandler.bind(this));

    this._setupEventListeners();
  }

  _loadConfig() {
    return {
      vpsUrl: `${this._getRequiredConfig('VPS_PROTOCOL')}://${this._getRequiredConfig('VPS_HOST')}:${this._getRequiredConfig('VPS_PORT')}${process.env.VPS_PATH || ''}`,
      requireAuth: process.env.REQUIRE_AUTH === 'true',
      tokenSecret: this._getRequiredConfig('TOKEN_SECRET'),
      clientPort: this._getRequiredConfig('VPS_PORT')
    };
  }

  _getRequiredConfig(envVar) {
    const value = process.env[envVar];
    if (!value) throw new Error(`Missing required env var: ${envVar}`);
    return value;
  }

  _setupEventListeners() {
    this.vpsClient.on(VPSClient.EVENTS.CONNECTED, () => {
      console.log('✅ Connected to VPS Relay Proxy');
    });

    this.vpsClient.on(VPSClient.EVENTS.DISCONNECTED, () => {
      console.log('❌ Disconnected from VPS Relay Proxy');
    });

    this.vpsClient.on(VPSClient.EVENTS.ERROR, (error) => {
      console.error('❌ VPS connection error:', error);
    });
  }

  healthCheckHandler(req, res) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Connection': 'close'
    });
    res.end(JSON.stringify({
      status: 'running',
      timestamp: new Date().toISOString(),
      clients: this.proxy?.clients?.size || 0
    }));
  }

  async start() {
    try {
      await this.proxy.initialize();
      this.vpsClient.connect();
      
      this.server.listen(process.env.HTTP_PORT || 8080, () => {
        console.log(`✅ Server running on port ${process.env.HTTP_PORT || 8080}`);
        console.log(`📡 WebSocket endpoint: ${this.config.vpsUrl}`);
      });

      SHUTDOWN_SIGNALS.forEach(signal => {
        process.on(signal, () => {
          console.log(`\n${signal} received, shutting down...`);
          this.shutdown().finally(() => process.exit(0));
        });
      });

    } catch (error) {
      console.error('🔥 Failed to start:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down services...');
    try {
      // Ordered shutdown sequence
      await this.vpsClient.disconnect();  // 1. Disconnect upstream first
      await this.proxy.shutdown();       // 2. Close client connections
      await new Promise((resolve) => {
        this.server.close(resolve);      // 3. Close HTTP server
      });
      console.log('✅ Services stopped cleanly');
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      throw err; // Re-throw to ensure process.exit(1) in signal handler
    }
  }
}

// Start the application
new Application().start().catch((err) => {
  console.error('💥 Critical startup failure:', err);
  process.exit(1);
});