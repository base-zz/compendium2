// src/server/index.js
import dotenv from "dotenv";

// Global event loop heartbeat for debugging
setInterval(() => {
  console.log(`[DEBUG][GLOBAL][PID:${process.pid}] Event loop heartbeat`);
}, 60000);
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { router, setupWebSocketHandlers } from './api/v1/index.js';
import { stateService } from './state/StateService.js';
import { VPSConnector } from '../relay/server/services/VPSConnector.js';

import { startRelayServer } from '../relay/server/index.js';
import { startDirectServer } from '../relay/server/index.js';



console.log("Loading .env.server")
dotenv.config({ path: ".env.server" });



const app = express();
const httpServer = createServer(app);

async function startServer() {
  try {
    // 1. Initialize unified state service (connects to SignalK, etc.)
    console.log('[SERVER] Initializing StateService...');
    await stateService.initialize();

    // 2. Mount API routes
    app.use('/api/v1', router);

    // 3. Set up WebSocket server & handlers
    const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    setupWebSocketHandlers(wss);

    // 4. Start HTTP server
    const PORT = process.env.PORT || 8080;
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Listening on port ${PORT}`);
    });


    // Start the RelayServer with explicit config
    const relayConfig = {
      port: parseInt(process.env.RELAY_PORT || process.env.RELAY_SERVER_PORT || process.env.PORT || '8081', 10),
      signalKRefreshRate: parseInt(process.env.SIGNALK_REFRESH_RATE || '1000', 10),
      defaultThrottleRate: parseInt(process.env.DEFAULT_THROTTLE_RATE || '5000', 10),
      requireAuth: process.env.REQUIRE_AUTH === 'true',
      tokenSecret: process.env.TOKEN_SECRET,
      vpsUrl: (() => {
        if (process.env.VPS_URL) return process.env.VPS_URL;
        if (process.env.RELAY_SERVER_URL) return process.env.RELAY_SERVER_URL;
        // Build from components if possible
        if (process.env.VPS_HOST) {
          const proto = process.env.VPS_WS_PORT === '443' ? 'wss' : 'ws';
          const host = process.env.VPS_HOST;
          const port = process.env.VPS_WS_PORT && process.env.VPS_WS_PORT !== '80' && process.env.VPS_WS_PORT !== '443'
            ? `:${process.env.VPS_WS_PORT}` : '';
          const path = process.env.VPS_PATH || '/relay';
          return `${proto}://${host}${port}${path}`;
        }
        return undefined;
      })(),
      // Add any other needed config here
    };
    if (!relayConfig.port || isNaN(relayConfig.port)) throw new Error('RelayServer: port must be set via env');
    if (!relayConfig.tokenSecret) throw new Error('RelayServer: tokenSecret must be set via env');
    if (!relayConfig.vpsUrl) throw new Error('RelayServer: vpsUrl must be set via env');
    const relayServer = await startRelayServer(relayConfig);

    
    // 6. Relay state updates to VPS
    stateService.on('state-updated', (data) => {
      try {
        vpsConnector.sendUpdate(data); // Assumes sendUpdate sends data to VPS
      } catch (err) {
        console.error('[SERVER] Failed to send update to VPS:', err);
      }
    });

    // 7. Start Direct WebSocket server
    const directServer = await startDirectServer({ port: parseInt(process.env.DIRECT_WS_PORT, 10) });

    // 8. Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[SERVER] Shutting down gracefully...');
      wss.close();
      if (directServer && directServer.shutdown) {
        directServer.shutdown();
      }
      httpServer.close(async () => {
        if (vpsConnector && vpsConnector.disconnect) {
          await vpsConnector.disconnect();
        }
        process.exit(0);
      });
    });

  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

startServer();