#!/usr/bin/env node

/**
 * Token Management CLI Tool
 * 
 * Command-line tool to manage user tokens for the VPS Relay Proxy authentication system.
 * 
 * Usage:
 *   node manageTokens.js generate <userId> <vesselId> [userName]  - Generate a new token for a user
 *   node manageTokens.js list                                     - List all tokens
 *   node manageTokens.js revoke <tokenId>                         - Revoke a specific token
 *   node manageTokens.js revoke-user <userId>                     - Revoke all tokens for a user
 *   node manageTokens.js revoke-expired                           - Revoke all expired tokens
 *   node manageTokens.js info <tokenId>                           - Show detailed info for a token
 *   node manageTokens.js verify <token>                           - Verify if a token is valid
 */

// Load environment variables from .env file if available
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { tokenManager } from './tokenManager.js';
import readline from 'readline';

// Environment Setup
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from .env file');
  } else {
    console.log('No .env file found in current directory, using default environment');
  }
} catch (error) {
  console.log('Error loading environment variables:', error.message);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main function
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    showHelp();
    process.exit(0);
  }
  
  switch (command.toLowerCase()) {
    case 'generate':
      await generateToken();
      break;
      
    case 'list':
      listTokens();
      break;
      
    case 'revoke':
      await revokeToken();
      break;
      
    case 'revoke-user':
      await revokeUserTokens();
      break;
      
    case 'revoke-expired':
      revokeExpiredTokens();
      break;
      
    case 'info':
      showTokenInfo();
      break;
      
    case 'verify':
      verifyToken();
      break;
      
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
      break;
  }
  
  rl.close();
}

// Show help
function showHelp() {
  console.log(`
Token Management CLI Tool

Usage:
  node manageTokens.js generate <userId> <vesselId> [userName]  - Generate a new token for a user
  node manageTokens.js list                                     - List all tokens
  node manageTokens.js revoke <tokenId>                         - Revoke a specific token
  node manageTokens.js revoke-user <userId>                     - Revoke all tokens for a user
  node manageTokens.js revoke-expired                           - Revoke all expired tokens
  node manageTokens.js info <tokenId>                           - Show detailed info for a token
  node manageTokens.js verify <token>                           - Verify if a token is valid
  `);
}

// Generate a token
async function generateToken() {
  const userId = process.argv[3];
  const vesselId = process.argv[4];
  const userName = process.argv[5] || '';
  
  if (!userId || !vesselId) {
    console.log('Error: User ID and Vessel ID are required');
    console.log('Usage: node manageTokens.js generate <userId> <vesselId> [userName]');
    process.exit(1);
  }
  
  // Check if user already has tokens for this vessel
  const tokens = tokenManager.getAllTokens();
  const existingTokens = tokens.filter(t => t.userId === userId && t.vesselId === vesselId);
  
  if (existingTokens.length > 0) {
    const answer = await askQuestion(`User ${userId} already has ${existingTokens.length} token(s) for vessel ${vesselId}. Generate a new one? (y/n): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Operation cancelled');
      process.exit(0);
    }
  }
  
  // Generate token
  const token = tokenManager.generateToken(userId, vesselId, userName);
  
  console.log('\n==== TOKEN GENERATED ====');
  console.log(`User ID: ${userId}`);
  console.log(`Vessel ID: ${vesselId}`);
  console.log(`User Name: ${userName || userId}`);
  console.log(`Token: ${token}`);
  console.log('\nIMPORTANT: Save this token! It will not be displayed again in full.');
  console.log('==========================\n');
  
  // Show connection example
  console.log('Connection Example:');
  console.log(`const socket = new WebSocket('wss://yourdomain.com/relay?token=${token}');\n`);
}

// List all tokens
function listTokens() {
  const tokens = tokenManager.getAllTokens();
  
  if (tokens.length === 0) {
    console.log('No tokens found');
    return;
  }
  
  console.log('\n==== USER TOKENS ====');
  tokens.forEach((tokenInfo, index) => {
    console.log(`${index + 1}. Token ID: ${tokenInfo.id}`);
    console.log(`   User ID: ${tokenInfo.userId}`);
    console.log(`   Vessel ID: ${tokenInfo.vesselId}`);
    console.log(`   Name: ${tokenInfo.name}`);
    console.log(`   Created: ${new Date(tokenInfo.created).toLocaleString()}`);
    const expiresAt = tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt * 1000).toLocaleString() : 'Never';
    console.log(`   Expires: ${expiresAt}`);
    console.log(`   Token Preview: ${tokenInfo.tokenPreview}`);
    console.log('');
  });
}

// Revoke a specific token by ID
async function revokeToken() {
  const tokenId = process.argv[3];
  
  if (!tokenId) {
    console.log('Error: Token ID is required');
    console.log('Usage: node manageTokens.js revoke <tokenId>');
    process.exit(1);
  }
  
  // Get token info to display
  const tokens = tokenManager.getAllTokens();
  const tokenInfo = tokens.find(t => t.id === tokenId);
  
  if (!tokenInfo) {
    console.log(`No token found with ID ${tokenId}`);
    return;
  }
  
  const answer = await askQuestion(`Are you sure you want to revoke the token ${tokenId} for user ${tokenInfo.userId}, vessel ${tokenInfo.vesselId}? (y/n): `);
  if (answer.toLowerCase() !== 'y') {
    console.log('Operation cancelled');
    process.exit(0);
  }
  
  const result = tokenManager.revokeTokenById(tokenId);
  
  if (result) {
    console.log(`Token ${tokenId} has been revoked`);
  } else {
    console.log(`Failed to revoke token ${tokenId}`);
  }
}

// Revoke all tokens for a specific user
async function revokeUserTokens() {
  const userId = process.argv[3];
  
  if (!userId) {
    console.log('Error: User ID is required');
    console.log('Usage: node manageTokens.js revoke-user <userId>');
    process.exit(1);
  }
  
  // Get tokens for this user
  const tokens = tokenManager.getAllTokens();
  const userTokens = tokens.filter(t => t.userId === userId);
  
  if (userTokens.length === 0) {
    console.log(`No tokens found for user ${userId}`);
    return;
  }
  
  console.log(`Found ${userTokens.length} token(s) for user ${userId}`);
  
  const answer = await askQuestion(`Are you sure you want to revoke ALL tokens for user ${userId}? (y/n): `);
  if (answer.toLowerCase() !== 'y') {
    console.log('Operation cancelled');
    process.exit(0);
  }
  
  let revokedCount = 0;
  for (const token of userTokens) {
    const result = tokenManager.revokeTokenById(token.id);
    if (result) revokedCount++;
  }
  
  console.log(`Revoked ${revokedCount} token(s) for user ${userId}`);
}

// Revoke all expired tokens
function revokeExpiredTokens() {
  const count = tokenManager.revokeExpiredTokens();
  console.log(`Revoked ${count} expired token(s)`);
}

// Show detailed info for a specific token
function showTokenInfo() {
  const tokenId = process.argv[3];
  
  if (!tokenId) {
    console.log('Error: Token ID is required');
    console.log('Usage: node manageTokens.js info <tokenId>');
    process.exit(1);
  }
  
  const tokens = tokenManager.getAllTokens();
  const tokenInfo = tokens.find(t => t.id === tokenId);
  
  if (!tokenInfo) {
    console.log(`No token found with ID ${tokenId}`);
    return;
  }
  
  console.log('\n==== TOKEN INFORMATION ====');
  console.log(`Token ID: ${tokenInfo.id}`);
  console.log(`User ID: ${tokenInfo.userId}`);
  console.log(`Vessel ID: ${tokenInfo.vesselId}`);
  console.log(`Name: ${tokenInfo.name}`);
  console.log(`Created: ${new Date(tokenInfo.created).toLocaleString()}`);
  
  const expiresAt = tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt * 1000).toLocaleString() : 'Never';
  console.log(`Expires: ${expiresAt}`);
  
  const now = Math.floor(Date.now() / 1000);
  const isExpired = tokenInfo.expiresAt && tokenInfo.expiresAt < now;
  console.log(`Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);
  
  console.log(`Token Preview: ${tokenInfo.tokenPreview}`);
  console.log('===========================');
}

// Verify if a token is valid
function verifyToken() {
  const token = process.argv[3];
  
  if (!token) {
    console.log('Error: Token is required');
    console.log('Usage: node manageTokens.js verify <token>');
    process.exit(1);
  }
  
  try {
    const decoded = tokenManager.verifyToken(token);
    console.log('\n==== TOKEN VERIFICATION ====');
    console.log('Token is VALID');
    console.log(`User ID: ${decoded.sub}`);
    console.log(`Vessel ID: ${decoded.vesselId}`);
    console.log(`Name: ${decoded.name}`);
    
    const issuedAt = new Date(decoded.iat * 1000).toLocaleString();
    console.log(`Issued At: ${issuedAt}`);
    
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'Never';
    console.log(`Expires At: ${expiresAt}`);
    
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = decoded.exp ? decoded.exp - now : Infinity;
    
    if (timeRemaining === Infinity) {
      console.log('Time Remaining: Never expires');
    } else if (timeRemaining <= 0) {
      console.log('Time Remaining: EXPIRED');
    } else {
      const days = Math.floor(timeRemaining / 86400);
      const hours = Math.floor((timeRemaining % 86400) / 3600);
      const minutes = Math.floor((timeRemaining % 3600) / 60);
      console.log(`Time Remaining: ${days}d ${hours}h ${minutes}m`);
    }
    
    console.log('============================');
  } catch (error) {
    console.log('\n==== TOKEN VERIFICATION ====');
    console.log('Token is INVALID');
    console.log(`Error: ${error.message}`);
    console.log('============================');
  }
}

// Helper function to ask a question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
