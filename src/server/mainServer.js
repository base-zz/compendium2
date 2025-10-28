import dotenv from "dotenv";
import { stateService } from "./state/StateService.js";
import { startRelayServer } from "../relay/server/index.js";
import { startDirectServer } from "../relay/server/index.js";
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Loading .env.server");
dotenv.config({ path: ".env.server" });

// --- Helper to build the VPS URL ---
function buildVpsUrl() {
  if (process.env.VPS_URL) return process.env.VPS_URL;
  if (process.env.RELAY_SERVER_URL) return process.env.RELAY_SERVER_URL;
  if (process.env.VPS_HOST) {
    const proto = process.env.VPS_WS_PORT === "443" ? "wss" : "ws";
    const host = process.env.VPS_HOST;
    const port =
      process.env.VPS_WS_PORT &&
      process.env.VPS_WS_PORT !== "80" &&
      process.env.VPS_WS_PORT !== "443"
        ? `:${process.env.VPS_WS_PORT}`
        : "";
    const path = process.env.VPS_PATH || "/relay";
    return `${proto}://${host}${port}${path}`;
  }
  return undefined;
}

// --- Bridge canonical state into relay state manager ---
async function bridgeStateToRelay() {
  console.log("[SERVER] Starting state bridge to relay");
  try {
    const { stateData } = await import("./state/StateData.js");
    const { stateManager } = await import(
      "../relay/core/state/StateManager.js"
    );

    // Bridge canonical StateService events to relay stateManager
    stateService.on("state:full-update", (msg) => {
      // console.log("[SERVER] Received full state update from StateService:", JSON.stringify(msg) );
      stateManager.receiveExternalStateUpdate(msg.data);
    });
    console.log("     [SERVER] Initiated StateService full update listener");

    stateService.on("state:patch", (msg) => {
      // console.log("[SERVER] Received patch update from StateService:", msg);
      stateManager.applyPatchAndForward(msg.data);
    });
    console.log(".    [SERVER] Initiated StateService patch listener");

    console.log("     [SERVER] All Server bridges activated.");
  } catch (err) {
    console.error("[SERVER] !!!!!! Failed to set up state bridge:", err);
  }
}

async function startServer() {
  try {
    // 0. Ensure unit preferences are available before starting data ingestion
    if (stateService.preferencesPromise) {
      try {
        await stateService.preferencesPromise;
      } catch (prefErr) {
        console.error('[SERVER] Failed to load unit preferences before initialization:', prefErr);
      }
    }

    // 1. Start StateService (SignalK, data ingestion)
    await stateService.initialize();

    // 2. Bridge canonical state into relay state manager
    await bridgeStateToRelay();

    // 3. Build relay config
    const relayConfig = {
      port: parseInt(
        process.env.RELAY_PORT ||
          process.env.RELAY_SERVER_PORT ||
          process.env.PORT ||
          "8081",
        10
      ),
      signalKRefreshRate: parseInt(
        process.env.SIGNALK_REFRESH_RATE || "1000",
        10
      ),
      defaultThrottleRate: parseInt(
        process.env.DEFAULT_THROTTLE_RATE || "5000",
        10
      ),
      requireAuth: process.env.REQUIRE_AUTH === "true",
      tokenSecret: process.env.TOKEN_SECRET,
      vpsUrl: buildVpsUrl(),
      // Add any other needed config here
    };
    if (!relayConfig.port || isNaN(relayConfig.port))
      throw new Error("RelayServer: port must be set via env");
    if (!relayConfig.tokenSecret)
      throw new Error("RelayServer: tokenSecret must be set via env");
    if (!relayConfig.vpsUrl)
      throw new Error("RelayServer: vpsUrl must be set via env");

    // 4. Start relay server
    await startRelayServer(relayConfig);

    // 5. Start HTTPS server
    const PORT = process.env.PORT || 8080;
    const httpsServer = https.createServer({
      key: fs.readFileSync(path.resolve(__dirname, '../../ssl/compendium.local.key')),
      cert: fs.readFileSync(path.resolve(__dirname, '../../ssl/compendium.local.cert'))
    });
    
    httpsServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] HTTPS server listening on port ${PORT}`);
    });

    // 6. Relay state updates to VPS (optional, placeholder for future logic)
    stateService.on("state-updated", (data) => {
      // VPS relay logic can be added here if needed in the future
    });

    // 7. Start Direct WebSocket server (optional)
    if (process.env.DIRECT_WS_PORT) {
      const directServer = await startDirectServer({
        port: parseInt(process.env.DIRECT_WS_PORT, 10),
      });
      console.log(
        `[SERVER] Direct WebSocket server started on port ${process.env.DIRECT_WS_PORT}`
      );
      // Handle graceful shutdown for directServer if needed
      process.on("SIGINT", async () => {
        console.log("\n[SERVER] Shutting down gracefully...");
        if (directServer && directServer.shutdown) {
          directServer.shutdown();
        }
        httpServer.close(() => process.exit(0));
      });
    }
  } catch (err) {
    console.error("[SERVER] Failed to start:", err);
    process.exit(1);
  }
}

startServer();
