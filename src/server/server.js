import { createServiceBridge } from './bridges/serviceBridge';
import { BRIDGE_CONFIGS } from './config/bridges';
import WebSocket from 'ws';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Create HTTPS server with SSL certificates
const httpsServer = https.createServer({
  key: fs.readFileSync(path.resolve(__dirname, '../../ssl/compendium.local.key')),
  cert: fs.readFileSync(path.resolve(__dirname, '../../ssl/compendium.local.cert'))
});

// Create WebSocket server attached to the HTTPS server
const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', (ws, req) => {
  // Initialize all bridges
  Object.values(BRIDGE_CONFIGS).forEach(config => {
    const bridge = createServiceBridge(config.service, config);
    bridge.setup(ws, req);
  });
});

// Start the server
const PORT = 3002;
httpsServer.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on wss://localhost:${PORT}`);
});