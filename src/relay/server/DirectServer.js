// src/relay/server/DirectServer.js
// Minimal direct WebSocket server that mimics the relay server's patch data flow

import { WebSocketServer } from 'ws';
import { StateManager } from './core/state/StateManager.js';
import { RuleEngine } from './core/state/ruleEngine.js';
import { AllRules } from './core/state/rules.js';
import { getOrCreateAppUuid } from "../../server/uniqueAppId.js";

const boatId = getOrCreateAppUuid();

// Use the same rule engine and state data as the relay
const ruleEngine = new RuleEngine(AllRules);
const stateManager = new StateManager(ruleEngine);
stateManager.attachToStateData(); // Only call once globally

/**
 * Starts the direct WebSocket server, mimicking relay patch flow.
 * Returns a shutdown function.
 */
async function startDirectServer(options = {}) {
  const PORT = options.port || parseInt(process.env.DIRECT_WS_PORT, 10);
  if (!PORT) {
    throw new Error("DIRECT_WS_PORT must be specified in options or environment.");
  }
  const wss = new WebSocketServer({ port: PORT });

  console.log(`[DIRECT SERVER] Direct WebSocket server started on port ${PORT}`);

  wss.on('connection', (ws) => {
    console.log('[DIRECT SERVER] New client connected');
    try {
      const fullState = stateManager.getState();
      console.log('[DIRECT SERVER] fullState:', fullState);
      ws.send(JSON.stringify({ type: 'full-state', state: fullState }));
      console.log('[DIRECT SERVER] Sent initial full-state to client');
    } catch (err) {
      console.error('[DIRECT SERVER] Failed to send initial full-state:', err);
    }
    // Handler to forward state-update patches
    const handler = (patch) => {
      try {
        ws.send(JSON.stringify({ type: 'state-update', patch }));
      } catch (err) {
        console.error('[DIRECT SERVER] Failed to send patch to client:', err);
      }
    };
    stateManager.on('state-update', handler);

    ws.on('close', () => {
      console.log('[DIRECT SERVER] Client disconnected');
      stateManager.off('state-update', handler);
    });
  });

  // Provide a shutdown method for cleanup
  function shutdown() {
    console.log('[DIRECT SERVER] Shutting down Direct WebSocket server...');
    wss.close();
  }

  return { wss, shutdown };
}

export { startDirectServer };
