#!/usr/bin/env node

/**
 * Start VPS Data Viewer
 * 
 * This script starts a Vite development server to serve the VPS data viewer application.
 */

import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the client directory
const clientDir = resolve(__dirname, '../src/client');

// Create a temporary vite.config.js file
const tempConfigPath = resolve(clientDir, 'temp-vite.config.js');
const configContent = `
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3030,
    open: '/vps-data-viewer.html'
  }
});
`;

fs.writeFileSync(tempConfigPath, configContent);

// Start the Vite server
async function startServer() {
  console.log('Starting VPS Data Viewer...');
  console.log('Client directory:', clientDir);
  
  try {
    const server = await createServer({
      configFile: tempConfigPath,
      root: clientDir,
    });
    
    await server.listen();
    
    server.printUrls();
    console.log('\nVPS Data Viewer is running. Open the URL above in your browser.');
    console.log('Press Ctrl+C to stop the server.');
    
    // Clean up the temporary config file when the server is closed
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        console.log('\nCleaning up and shutting down...');
        try {
          fs.unlinkSync(tempConfigPath);
        } catch (err) {
          // Ignore errors when removing the temp file
        }
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error starting the server:', error);
    try {
      fs.unlinkSync(tempConfigPath);
    } catch (err) {
      // Ignore errors when removing the temp file
    }
    process.exit(1);
  }
}

startServer();
