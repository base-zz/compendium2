import { WebSocketServer } from "ws";
import { stateManager } from "../core/state/StateManager.js";

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
    // console.log(`[DIRECT] Broadcasting ${payload.type} to ${wss.clients.size} clients`);
    const message = JSON.stringify(payload);
    let sentCount = 0;
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && !exclude.has(client)) {
        client.send(message, (err) => {
          if (err) {
            console.warn("[DIRECT] Broadcast failed:", err);
            client.terminate();
          } else {
            sentCount++;
          }
        });
      }
    });
    
    // Log after a short delay to allow send callbacks to complete
    // setTimeout(() => {
    //   console.log(`[DIRECT] Broadcast complete: ${sentCount}/${wss.clients.size} clients received ${payload.type}`);
    // }, 50);
  };

  // Store handler references for proper cleanup
  // const fullUpdateHandler = (data) => broadcast('state:full-update', data);
  // const patchHandler = (patch) => broadcast('state:patch', patch);

  // Register state listeners
  const stateEventHandler = (payload) => {
    broadcast(payload);
    
    // Log after broadcast
    // setTimeout(() => {
    //   console.log(`[DIRECT] Active clients after broadcast: ${getActiveClientCount()}`);
    // }, 100);
  };

  stateManager.on('state:full-update', stateEventHandler);
  stateManager.on('state:patch', stateEventHandler);
  

  // Log active client count for debugging
  function getActiveClientCount() {
    let count = 0;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        count++;
      }
    });
    return count;
  }
  
  wss.on("connection", (ws, req) => {
    console.log(`[DIRECT] New connection from ${req.socket.remoteAddress}`);
    
    // Log active client count
    console.log(`[DIRECT] Active clients: ${getActiveClientCount()}`);

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

    // Handle incoming messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`[DIRECT] Received message from client: ${message.type}`);
        
        // Handle ping messages
        if (message.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
        }
        
        // Handle anchor state updates
        if (message.type === 'anchor:update' && message.data) {
          console.log(`[DIRECT] Received anchor update from client`);
          
          // Forward the anchor data to the StateManager
          // The StateManager is the single source of truth for state changes
          const success = stateManager.updateAnchorState(message.data);
          
          // Acknowledge receipt
          ws.send(JSON.stringify({
            type: 'anchor:update:ack',
            success,
            timestamp: Date.now()
          }));
        }
      } catch (e) {
        console.warn("[DIRECT] Invalid message from client:", e);
      }
    });

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30000);

    // Cleanup on disconnect
    ws.on("close", () => {
      clearInterval(heartbeat);
      console.log("[DIRECT] Client disconnected");
      
      // Log active client count
      console.log(`[DIRECT] Active clients: ${getActiveClientCount()}`);
    });

    ws.on("error", (err) => {
      console.warn("[DIRECT] Client error:", err);
    });
  });

  function shutdown() {
    console.log("[DIRECT] Shutting down...");

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
