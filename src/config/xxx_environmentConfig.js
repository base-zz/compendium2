/**
 * Environment Configuration Manager
 * 
 * This module provides a centralized way to load and validate environment variables
 * from specific .env files for different components of the application.
 * 
 * It enforces strict validation (no fallbacks) to ensure configuration issues
 * are caught early and clearly reported.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Load environment variables from a specific .env file
 * @param {string} envPath - Path to the .env file
 * @returns {Object} - Loaded environment variables
 */
export function loadEnvFile(envPath) {
  // Check if file exists
  if (!fs.existsSync(envPath)) {
    throw new Error(`❌ Environment file not found: ${envPath}`);
  }
  
  console.log(`📝 Loading environment from: ${envPath}`);
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error(`❌ Error loading ${envPath}: ${result.error.message}`);
    throw new Error(`Failed to load environment from ${envPath}`);
  }
  
  // Log loaded environment variables (without sensitive data)
  console.log('Environment variables loaded:');
  for (const key in result.parsed) {
    // Don't log secrets or tokens
    if (key.includes('SECRET') || key.includes('TOKEN')) {
      console.log(`  ${key}: [REDACTED]`);
    } else {
      console.log(`  ${key}: ${result.parsed[key]}`);
    }
  }
  
  return result.parsed;
}

/**
 * Get a required environment variable
 * @param {string} key - Environment variable name
 * @param {string} source - Source .env file (for error reporting)
 * @returns {string} - Environment variable value
 */
export function getRequiredEnv(key, source = '.env') {
  const value = process.env[key];
  if (!value) {
    throw new Error(`❌ Missing required env var: ${key} (from ${source})`);
  }
  return value;
}

/**
 * Load Relay Server configuration
 * Uses src/relay/.env and also loads VPS connection info from src/relay/vps/.env
 */
export function loadRelayServerConfig() {
  // First load the main relay server config
  const relayEnvPath = path.join(projectRoot, 'src/relay/.env');
  loadEnvFile(relayEnvPath);
  
  // Then load the VPS config so the relay server knows how to connect to the VPS
  const vpsEnvPath = path.join(projectRoot, 'src/relay/vps/.env');
  try {
    loadEnvFile(vpsEnvPath);
    console.log('✅ Successfully loaded VPS configuration for relay server');
  } catch (error) {
    console.warn(`⚠️ Warning: ${error.message}`);
    console.warn('⚠️ Relay server may not be able to connect to VPS Relay Proxy');
  }
  
  return {
    // Relay server config
    signalKUrl: getRequiredEnv('SIGNALK_URL', 'src/relay/.env'),
    port: getRequiredEnv('PORT', 'src/relay/.env'),
    signalKRefreshRate: getRequiredEnv('SIGNALK_REFRESH_RATE', 'src/relay/.env'),
    defaultThrottleRate: getRequiredEnv('DEFAULT_THROTTLE_RATE', 'src/relay/.env'),
    logLevel: getRequiredEnv('LOG_LEVEL', 'src/relay/.env'),
    
    // VPS connection info (if available)
    vpsUrl: process.env.RELAY_SERVER_URL || null,
    vpsPort: process.env.VPS_PROXY_PORT || null,
    vpsPath: process.env.VPS_PROXY_PATH || null,
    
    // Authentication
    requireAuth: process.env.REQUIRE_AUTH === 'true',
    tokenSecret: process.env.TOKEN_SECRET
  };
}

/**
 * Load VPS Relay Proxy configuration
 * Uses src/relay/vps/.env
 */
export function loadVpsRelayConfig() {
  const envPath = path.join(projectRoot, 'src/relay/vps/.env');
  loadEnvFile(envPath);
  
  return {
    proxyPort: getRequiredEnv('VPS_PROXY_PORT', 'src/relay/vps/.env'),
    proxyPath: getRequiredEnv('VPS_PROXY_PATH', 'src/relay/vps/.env'),
    relayServerUrl: getRequiredEnv('RELAY_SERVER_URL', 'src/relay/vps/.env'),
    requireAuth: getRequiredEnv('REQUIRE_AUTH', 'src/relay/vps/.env'),
    tokenSecret: getRequiredEnv('TOKEN_SECRET', 'src/relay/vps/.env'),
    tokenExpiry: getRequiredEnv('TOKEN_EXPIRY', 'src/relay/vps/.env'),
    reconnectDelay: getRequiredEnv('RECONNECT_DELAY', 'src/relay/vps/.env')
  };
}

/**
 * Load Client configuration
 * Uses .env.relay-server
 */
export function loadClientConfig() {
  const envPath = path.join(projectRoot, '.env.relay-server');
  loadEnvFile(envPath);
  
  return {
    signalKUrl: getRequiredEnv('SIGNALK_URL', '.env.relay-server'),
    signalKToken: getRequiredEnv('SIGNALK_TOKEN', '.env.relay-server')
    // Add other client-specific variables as needed
  };
}
