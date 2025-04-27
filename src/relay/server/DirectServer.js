// src/relay/server/DirectServer.js
// Minimal direct WebSocket server that mimics the relay server's patch data flow

import { WebSocketServer } from 'ws';
import { stateManager } from '../core/state/StateManager.js'; // Canonical StateManager instance
import { RuleEngine } from './core/state/ruleEngine.js';
import { AllRules } from './core/state/rules.js';
import { getOrCreateAppUuid } from "../../server/uniqueAppId.js";

const boatId = getOrCreateAppUuid();

// Use the same rule engine and state data as the relay
const ruleEngine = new RuleEngine(AllRules);

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
      // console.log('[DIRECT SERVER] Retrieved fullState from stateManager:', fullState);
      const sanitizedState = JSON.parse(JSON.stringify(fullState));
      // console.log('[DIRECT SERVER] sanitizedState:', sanitizedState);
      const outgoingMsg = JSON.stringify({ type: 'full-state', data: sanitizedState });
      // console.log('[DIRECT SERVER] Sending full-state message over WebSocket:', outgoingMsg);
      ws.send(outgoingMsg);
      console.log('[DIRECT SERVER] Sent initial full-state to client');
    } catch (err) {
      console.error('[DIRECT SERVER] Failed to send initial full-state:', err);
    }
    // Listen for canonical state updates from StateManager and relay to clients
    stateManager.on('state-updated', (appState) => {
      try {
        ws.send(JSON.stringify({ type: 'state-update', data: appState }));
      } catch (err) {
        console.error('[DIRECT SERVER] Failed to send patch to client:', err);
      }
    });

    ws.on('close', () => {
      console.log('[DIRECT SERVER] Client disconnected');
      stateManager.off('state-updated', (appState) => {
        try {
          ws.send(JSON.stringify({ type: 'state-update', data: appState }));
        } catch (err) {
          console.error('[DIRECT SERVER] Failed to send patch to client:', err);
        }
      });
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
