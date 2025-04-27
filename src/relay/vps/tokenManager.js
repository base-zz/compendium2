/**
 * Simple Token Manager for VPS Relay Proxy
 * 
 * This provides basic functionality to manage authentication tokens
 * for users connecting to the relay system.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TokenManager {
  constructor(config = {}) {
    this.config = {
      tokenFile: process.env.TOKEN_FILE || path.join(__dirname, 'tokens.json'),
      tokenSecret: process.env.TOKEN_SECRET || 'change_this_in_production',
      tokenExpiry: parseInt(process.env.TOKEN_EXPIRY || '86400', 10), // Default 24 hours
      ...config
    };
    
    this.tokens = new Map();
    this._loadTokens();
  }
  
  /**
   * Load tokens from file
   */
  _loadTokens() {
    try {
      if (fs.existsSync(this.config.tokenFile)) {
        const data = fs.readFileSync(this.config.tokenFile, 'utf8');
        const tokenData = JSON.parse(data);
        
        // Convert to Map
        Object.entries(tokenData).forEach(([userId, tokenInfo]) => {
          // Skip expired tokens
          if (tokenInfo.expiresAt && tokenInfo.expiresAt < Date.now()) {
            console.log(`[TOKEN] Skipping expired token for user ${userId}`);
            return;
          }
          
          this.tokens.set(userId, tokenInfo);
        });
        
        console.log(`[TOKEN] Loaded ${this.tokens.size} valid tokens`);
      } else {
        console.log('[TOKEN] No token file found, starting with empty token list');
      }
    } catch (error) {
      console.error('[TOKEN] Error loading tokens:', error);
    }
  }
  
  /**
   * Save tokens to file
   */
  _saveTokens() {
    try {
      // Convert Map to object for JSON serialization
      const tokenData = {};
      this.tokens.forEach((tokenInfo, userId) => {
        tokenData[userId] = tokenInfo;
      });
      
      fs.writeFileSync(
        this.config.tokenFile,
        JSON.stringify(tokenData, null, 2),
        'utf8'
      );
      
      console.log('[TOKEN] Saved tokens to file');
    } catch (error) {
      console.error('[TOKEN] Error saving tokens:', error);
    }
  }
  
  /**
   * Generate a new token for a user
   * @param {string} userId - The user ID
   * @param {string} vesselId - The vessel ID associated with this user
   * @param {string} name - Optional user name
   * @returns {string} - The JWT token
   */
  generateToken(userId, vesselId, name = '') {
    if (!userId) {
      throw new Error('User ID is required to generate a token');
    }
    
    if (!vesselId) {
      throw new Error('Vessel ID is required to generate a token');
    }
    
    // Create token payload
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.config.tokenExpiry;
    
    const payload = {
      sub: userId,
      vesselId,
      name: name || userId,
      iat: now,
      exp: expiresAt
    };
    
    // Create JWT token
    const token = this._createJWT(payload);
    
    // Store token information
    this.tokens.set(userId, {
      token,
      name: name || userId,
      vesselId,
      created: Date.now(),
      expiresAt: expiresAt * 1000 // Convert to milliseconds
    });
    
    // Save to file
    this._saveTokens();
    
    return token;
  }
  
  /**
   * Validate a token
   * @param {string} token - The JWT token to validate
   * @returns {Object} - Validation result with user and vessel information
   */
  validateToken(token) {
    if (!token) {
      return { valid: false, reason: 'No token provided' };
    }
    
    try {
      // First check if it's one of our stored tokens
      for (const [userId, tokenInfo] of this.tokens.entries()) {
        if (tokenInfo.token === token) {
          // Check if token has expired
          if (tokenInfo.expiresAt && tokenInfo.expiresAt < Date.now()) {
            return { valid: false, reason: 'Token expired' };
          }
          
          return {
            valid: true,
            userId,
            vesselId: tokenInfo.vesselId || 'default',
            name: tokenInfo.name
          };
        }
      }
      
      // If not found in our store, try to verify as JWT
      return this._verifyJWT(token);
    } catch (error) {
      console.error('[TOKEN] Token validation error:', error);
      return { valid: false, reason: 'Token validation error' };
    }
  }
  
  /**
   * Revoke a user's token
   * @param {string} userId - The user ID whose token should be revoked
   * @returns {boolean} - Whether the token was successfully revoked
   */
  revokeToken(userId) {
    if (this.tokens.has(userId)) {
      this.tokens.delete(userId);
      this._saveTokens();
      console.log(`[TOKEN] Revoked token for user ${userId}`);
      return true;
    }
    return false;
  }
  
  /**
   * Revoke all expired tokens
   * @returns {number} - Number of tokens revoked
   */
  revokeExpiredTokens() {
    const now = Date.now();
    let revokedCount = 0;
    
    for (const [userId, tokenInfo] of this.tokens.entries()) {
      if (tokenInfo.expiresAt && tokenInfo.expiresAt < now) {
        this.tokens.delete(userId);
        revokedCount++;
      }
    }
    
    if (revokedCount > 0) {
      this._saveTokens();
      console.log(`[TOKEN] Revoked ${revokedCount} expired tokens`);
    }
    
    return revokedCount;
  }
  
  /**
   * Get all tokens (for admin purposes)
   */
  getAllTokens() {
    const result = [];
    this.tokens.forEach((tokenInfo, userId) => {
      result.push({
        userId,
        name: tokenInfo.name,
        vesselId: tokenInfo.vesselId || 'default',
        created: tokenInfo.created,
        expires: tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt).toISOString() : 'never',
        // Don't include the actual token for security
        tokenPreview: tokenInfo.token.substring(0, 8) + '...'
      });
    });
    return result;
  }
  
  /**
   * Create a JWT token
   * @private
   */
  _createJWT(payload) {
    // In a production environment, you would use a proper JWT library
    // This is a simplified implementation for demonstration
    
    // Create header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    // Encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create signature
    const data = encodedHeader + '.' + encodedPayload;
    const signature = crypto.createHmac('sha256', this.config.tokenSecret)
      .update(data)
      .digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Return complete JWT
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  /**
   * Verify a JWT token
   * @private
   */
  _verifyJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, reason: 'Invalid token format' };
      }
      
      const [encodedHeader, encodedPayload, signature] = parts;
      
      // Verify signature
      const data = encodedHeader + '.' + encodedPayload;
      const expectedSignature = crypto.createHmac('sha256', this.config.tokenSecret)
        .update(data)
        .digest('base64')
        .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' };
      }
      
      // Decode payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
      
      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, reason: 'Token expired' };
      }
      
      return {
        valid: true,
        userId: payload.sub,
        vesselId: payload.vesselId || 'default',
        name: payload.name || payload.sub
      };
    } catch (error) {
      console.error('[TOKEN] JWT verification error:', error);
      return { valid: false, reason: 'Token verification error' };
    }
  }
  
  /**
   * Get all tokens as an array (for VPSRelayProxy)
   */
  getTokenArray() {
    const tokens = [];
    this.tokens.forEach(tokenInfo => {
      tokens.push(tokenInfo.token);
    });
    return tokens;
  }
}

// Create a singleton instance
const tokenManager = new TokenManager();

export { tokenManager };
