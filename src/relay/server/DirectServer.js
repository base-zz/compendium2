import { WebSocketServer } from "ws";
import { stateManager } from "../core/state/StateManager.js";
import { getOrCreateAppUuid } from "../../server/uniqueAppId.js";

const boatId = getOrCreateAppUuid();

async function startDirectServer(options = {}) {
  const PORT = options.port || parseInt(process.env.DIRECT_WS_PORT, 10);
  if (!PORT) throw new Error("DIRECT_WS_PORT must be specified");

  const wss = new WebSocketServer({
    port: PORT,
    maxPayload: options.maxPayload || 1024 * 1024, // 1MB default
  });

  console.log(`[DIRECT] Server started on port ${PORT}`);

  // Broadcast to all clients except specified ones
  function broadcast(payload, exclude = new Set()) {
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && !exclude.has(client)) {
        client.send(message, (err) => {
          if (err) {
            console.warn("[DIRECT] Broadcast failed:", err);
            client.terminate();
          }
        });
      }
    });
  };

  // Store handler references for proper cleanup
  // const fullUpdateHandler = (data) => broadcast('state:full-update', data);
  // const patchHandler = (patch) => broadcast('state:patch', patch);

  // Register state listeners
  // stateManager
  // .on('state:full-update', fullUpdateHandler)
  // .on('state:patch', patchHandler);
  const stateEventHandler = (payload) => broadcast(payload);

  stateManager.on('state:full-update', stateEventHandler);
  stateManager.on('state:patch', stateEventHandler);
  

  wss.on("connection", (ws, req) => {
    console.log(`[DIRECT] New connection from ${req.socket.remoteAddress}`);

    // Send initial state ONLY to this client
    ws.send(
      JSON.stringify({
        type: "state:full-update",
        data: stateManager.getState(),
        boatId: stateManager.boatId,
        timestamp: Date.now()
      }),
      (err) => {
        if (err) {
          console.error("[DIRECT] Initial state send failed:", err);
          ws.terminate();
          return;
        }
        console.log("[DIRECT] Initial state sent successfully");
      }
    );

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30000);

    // Cleanup on disconnect
    ws.on("close", () => {
      clearInterval(heartbeat);
      console.log("[DIRECT] Client disconnected");
    });

    ws.on("error", (err) => {
      console.warn("[DIRECT] Client error:", err);
    });
  });

  function shutdown() {
    console.log("[DIRECT] Shutting down...");

    // Cleanup listeners
    // stateManager
    //   .off("state:full-update", fullUpdateHandler)
    //   .off("state:patch", patchHandler);
    stateManager.off('state:full-update', stateEventHandler);
    stateManager.off('state:patch', stateEventHandler);

    // Close all connections
    wss.clients.forEach((client) => {
      client.terminate();
    });

    return new Promise((resolve) => wss.close(resolve));
  }

  return {
    wss,
    shutdown,
    getClientCount: () => wss.clients.size,
  };
}

export { startDirectServer };
