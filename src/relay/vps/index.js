import { createServer } from "http";
import { WebSocketServer } from "ws";
import { tokenManager } from "./tokenManager.js";
import dotenv from "dotenv";
import VPSRelayProxy from "./VPSRelayProxy.js";
import { readFileSync, existsSync } from "fs";
import https from "https";
import crypto from "crypto";

// ======================
// Configuration
// ======================
const envConfig = dotenv.config({ path: '/app/.env.vps' });
if (envConfig.error) {
  console.error('❌ Failed to load .env.vps:', envConfig.error);
  process.exit(1);
}

// Validate required env vars
const REQUIRED_ENV = ["VPS_PORT", "HTTP_PORT", "TOKEN_SECRET"];
REQUIRED_ENV.forEach((env) => {
  if (!process.env[env]) {
    console.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

// SSL Configuration
const USE_SSL = process.env.SSL_ENABLED === "true";
let sslOptions = {};

if (USE_SSL) {
  try {
    if (!existsSync(process.env.SSL_CERT_PATH)) {
      throw new Error(`Missing SSL cert at ${process.env.SSL_CERT_PATH}`);
    }
    if (!existsSync(process.env.SSL_KEY_PATH)) {
      throw new Error(`Missing SSL key at ${process.env.SSL_KEY_PATH}`);
    }
    
    sslOptions = {
      cert: readFileSync(process.env.SSL_CERT_PATH),
      key: readFileSync(process.env.SSL_KEY_PATH),
      minVersion: "TLSv1.2",
      ciphers: [
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
        "TLS_AES_128_GCM_SHA256",
      ].join(":"),
      honorCipherOrder: true,
    };
    console.log("✅ SSL certificates loaded from", process.env.SSL_CERT_PATH);
  } catch (err) {
    console.error("❌ SSL loading failed:", err.message);
    process.exit(1);
  }
}

const HTTP_PORT = process.env.HTTP_PORT;
const WS_PORT = process.env.VPS_PORT;
const HOST = process.env.VPS_HOST || "0.0.0.0";
const WS_PATH = process.env.VPS_PATH || "/relay";
const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS) || 500;
const REQUIRE_AUTH = process.env.REQUIRE_AUTH !== "false";

// ======================
// Server Initialization
// ======================
const httpServer = USE_SSL 
  ? https.createServer(sslOptions)
  : createServer();

httpServer.listen(process.env.PORT || 8080, () => {
  console.log(`Server listening on port ${httpServer.address().port}`);
});

const wss = new WebSocketServer({
  server: httpServer,
  path: '/relay',
  perMessageDeflate: false,
  maxPayload: 10 * 1024 * 1024
});

// Initialize VPSRelayProxy
const proxy = new VPSRelayProxy({
  httpServer,
  wss,
  config: {
    requireAuth: REQUIRE_AUTH,
    tokenSecret: process.env.TOKEN_SECRET,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
    maxConnections: MAX_CONNECTIONS,
  },
});

// Add SignalK connection handler
proxy.on("ready", async () => {
  try {
    await proxy.connectToSignalK();
    console.log("✅ Connected to SignalK server at", process.env.SIGNALK_URL);
  } catch (err) {
    console.error("❌ SignalK connection failed:", err.message);
    process.exit(1);
  }
});

// ======================
// Connection Tracking
// ======================
const activeConnections = new Map();

// ======================
// HTTP Server
// ======================
httpServer.on("request", (req, res) => {
  const requestId = `req_${Date.now()}`;
  
  const safeResponse = {
    end: function(code, data, headers = {}) {
      try {
        if (!res.writableEnded) {
          res.writeHead(code, headers);
          res.end(typeof data === 'string' ? data : JSON.stringify(data));
        }
      } catch (err) {
        console.error(`[${requestId}] Response failed:`, err);
      }
    }
  };

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Health Check Endpoint
    if (url.pathname === "/health") {
      const stats = {
        status: "healthy",
        ssl: USE_SSL,
        connections: {
          total: activeConnections.size,
          byVessel: Array.from(activeConnections.values()).reduce(
            (acc, conn) => {
              acc[conn.vesselId] = (acc[conn.vesselId] || 0) + 1;
              return acc;
            },
            {}
          ),
          relayConnected: !!proxy.relayServerConnection
        },
        memoryMB: process.memoryUsage().rss / 1024 / 1024,
        uptime: process.uptime()
      };
      return safeResponse.end(200, JSON.stringify(stats), {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      });
    }

    // Token Generation Endpoint
    if (url.pathname === `${WS_PATH}/generate-token`) {
      if (req.method !== "GET") {
        return safeResponse.end(405, {
          error: "method_not_allowed",
          message: "Only GET requests are accepted",
          docs: "https://api.example.com/docs/tokens"
        }, {
          "Content-Type": "application/json",
          "Retry-After": "60"
        });
      }

      const vesselId = url.searchParams.get("vessel");
      if (!vesselId) {
        return safeResponse.end(400, {
          error: "invalid_request",
          message: "Vessel ID is required as a query parameter",
          param: "vessel",
          example: `${WS_PATH}/generate-token?vessel=YOUR_VESSEL_ID`
        }, {
          "Content-Type": "application/json"
        });
      }

      const token = tokenManager.generate(vesselId);
      return safeResponse.end(200, token, {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store"
      });
    }

    // Fallback for unknown routes
    safeResponse.end(404, "Not Found");

  } catch (err) {
    console.error(`[${requestId}] Unhandled error:`, err);
    safeResponse.end(500, {
      error: "internal_error",
      requestId,
      message: "Unexpected server error"
    });
  }
});

// ======================
// WebSocket Upgrade Handler
// ======================
httpServer.on('upgrade', (req, socket, head) => {
  const connectionId = `upgrade_${Date.now()}`;
  const clientIP = req.socket.remoteAddress;

  try {
    // Capacity check
    if (activeConnections.size >= MAX_CONNECTIONS) {
      throw new Error("Server at maximum capacity");
    }

    // Validate WebSocket headers
    if (req.headers.upgrade?.toLowerCase() !== "websocket") {
      throw new Error("Invalid upgrade header");
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    // Authentication
    if (REQUIRE_AUTH) {
      if (!token) throw new Error("Authentication token required");
      const { valid, vesselId, reason } = tokenManager.validate(token);
      if (!valid) throw new Error(`Token validation failed: ${reason}`);
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const clientId = `conn_${Date.now()}`;
      const vesselId = REQUIRE_AUTH ? tokenManager.getVesselIdFromToken(token) : "anonymous";

      // Track connection
      activeConnections.set(clientId, {
        ws,
        vesselId,
        token: token?.substring(0, 8) + '...',
        connectedAt: Date.now(),
        ip: ws._socket?.remoteAddress || 'unknown',
      });

      proxy.registerConnection(clientId, ws, vesselId, token);

      console.log(
        `[${new Date().toISOString()}] Connection ${clientId} (${vesselId}) from ${ws._socket.remoteAddress}`
      );

      // Configure WebSocket
      ws._socket.setNoDelay(true);
      ws._socket.setKeepAlive(true, 30000);

      const originalSend = ws.send;
      ws.send = function(data, options, callback) {
        if (this.readyState !== this.OPEN) return;
        return originalSend.call(this, data, {
          fin: true,
          binary: false,
          mask: false,
          ...(typeof options === 'object' ? options : {})
        }, callback);
      };

      // Message handler
      ws.on("message", (data) => {
        try {
          const message = data.toString();
          proxy.handleClientMessage(clientId, message);

          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({status: "received"}), { fin: true });
          }
        } catch (err) {
          console.error(`[${clientId}] Message error:`, err);
          ws.close(1008, "Invalid message format");
        }
      });

      // Cleanup
      ws.on("close", () => {
        activeConnections.delete(clientId);
        proxy.unregisterConnection(clientId);
      });

      ws.on("error", (err) => {
        console.error(`[${clientId}] WebSocket error:`, err);
      });

      // Heartbeat
      const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping();
        } else {
          clearInterval(interval);
        }
      }, 30000);
    });
  } catch (err) {
    console.error(`[${connectionId}] Upgrade failed from ${clientIP}:`, err.message);
    socket.write(`HTTP/1.1 ${err.message.includes("capacity") ? 503 : 401} ${err.message}\r\n\r\n`);
    socket.destroy();
  }
});

// ======================
// Server Startup
// ======================
try {
  httpServer.listen(HTTP_PORT, HOST, () => {
    console.log(`\n${USE_SSL ? "🔒 HTTPS" : "HTTP"} server running on ${HOST}:${HTTP_PORT}`);
    console.log(`  WebSocket available at: ${USE_SSL ? "wss" : "ws"}://${HOST}:${HTTP_PORT}${WS_PATH}`);
    console.log(`  Token endpoint: ${USE_SSL ? "https" : "http"}://${HOST}:${HTTP_PORT}${WS_PATH}/generate-token`);
    console.log(`  Authentication: ${REQUIRE_AUTH ? "ENABLED" : "DISABLED"}`);
    console.log(`  Max connections: ${MAX_CONNECTIONS}`);
  });
} catch (err) {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
}

// ======================
// Graceful Shutdown
// ======================
const shutdown = async (signal) => {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);

  // Notify clients
  activeConnections.forEach(({ ws }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: "system",
        message: "Server maintenance in progress",
        timestamp: new Date().toISOString(),
      }));
      ws.close(1001, "Server shutdown");
    }
  });

  // Shutdown proxy
  await proxy.shutdown();

  // Close servers
  await new Promise((resolve) => httpServer.close(resolve));
  await new Promise((resolve) => wss.close(resolve));

  console.log("All connections closed. Exiting.");
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown("uncaughtException");
});