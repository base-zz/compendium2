import { WebSocket } from 'ws';
import { readFileSync } from 'fs';
import readline from 'readline';

const CERT_PATH = './ssl/fullchain.pem';
const WS_URL = 'wss://compendiumnav.com:8080/relay';

// Create WebSocket connection
const ws = new WebSocket(WS_URL, {
  ca: readFileSync(CERT_PATH),
  rejectUnauthorized: true
});

// Setup interactive console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connection handlers
ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  promptForMessage();
});

ws.on('message', (data) => {
  console.log('\n📨 Server:', data.toString());
  promptForMessage();
});

ws.on('close', () => {
  console.log('🚪 Connection closed');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err);
  process.exit(1);
});

// Interactive prompt
function promptForMessage() {
  rl.question('\nType a message to send (or "exit" to quit): ', (input) => {
    if (input.toLowerCase() === 'exit') {
      ws.close();
      rl.close();
    } else {
      ws.send(input);
    }
  });
}
