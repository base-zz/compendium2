/**
 * Client Key Pair Management
 * 
 * Handles generating, storing, and using RSA key pairs for client authentication
 * with the VPS Relay Proxy.
 */

// Use the Web Crypto API for cryptographic operations
const subtle = window.crypto.subtle;

// Constants for key storage
const PRIVATE_KEY_STORAGE_KEY = 'client_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'client_public_key';

/**
 * Convert an ArrayBuffer to a Base64 string
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} Base64 encoded string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert a Base64 string to an ArrayBuffer
 * @param {string} base64 - The Base64 string to convert
 * @returns {ArrayBuffer} The resulting ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Export a CryptoKey to PEM format
 * @param {CryptoKey} key - The key to export
 * @param {boolean} isPrivate - Whether this is a private key
 * @returns {Promise<string>} PEM formatted key
 */
async function exportKeyToPem(key, isPrivate) {
  const format = isPrivate ? 'pkcs8' : 'spki';
  const exported = await subtle.exportKey(format, key);
  const b64 = arrayBufferToBase64(exported);
  
  // Format as PEM
  const pemHeader = isPrivate ? '-----BEGIN PRIVATE KEY-----' : '-----BEGIN PUBLIC KEY-----';
  const pemFooter = isPrivate ? '-----END PRIVATE KEY-----' : '-----END PUBLIC KEY-----';
  
  // Insert newlines every 64 characters
  let formattedKey = b64.replace(/(.{64})/g, '$1\n');
  return `${pemHeader}\n${formattedKey}\n${pemFooter}`;
}

/**
 * Import a key from PEM format
 * @param {string} pem - The PEM formatted key
 * @param {boolean} isPrivate - Whether this is a private key
 * @param {boolean} extractable - Whether the key should be extractable
 * @returns {Promise<CryptoKey>} The imported key
 */
async function importKeyFromPem(pem, isPrivate, extractable = true) {
  // Remove PEM header, footer, and any whitespace
  const pemContents = pem.replace(/-{5}BEGIN (PRIVATE|PUBLIC) KEY-{5}/, '')
                         .replace(/-{5}END (PRIVATE|PUBLIC) KEY-{5}/, '')
                         .replace(/\s/g, '');
  
  const binaryDer = base64ToArrayBuffer(pemContents);
  
  return subtle.importKey(
    isPrivate ? 'pkcs8' : 'spki',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    extractable,
    isPrivate ? ['sign'] : ['verify']
  );
}

/**
 * Generate a new RSA key pair
 * @returns {Promise<Object>} Object containing publicKey and privateKey in PEM format
 */
async function generateKeyPair() {
  try {
    console.log('[CLIENT-KEY] Generating new RSA key pair');
    
    // Generate the key pair
    const keyPair = await subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: { name: 'SHA-256' },
      },
      true, // extractable
      ['sign', 'verify'] // usages
    );
    
    // Export the keys to PEM format
    const publicKeyPem = await exportKeyToPem(keyPair.publicKey, false);
    const privateKeyPem = await exportKeyToPem(keyPair.privateKey, true);
    
    return { publicKey: publicKeyPem, privateKey: privateKeyPem };
  } catch (error) {
    console.error('[CLIENT-KEY] Error generating key pair:', error);
    throw error;
  }
}

/**
 * Get or create the client's key pair
 * @returns {Promise<Object>} Object containing publicKey and privateKey in PEM format
 */
export async function getOrCreateClientKeyPair() {
  try {
    // Check if we already have keys stored
    const storedPrivateKey = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    const storedPublicKey = localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
    
    if (storedPrivateKey && storedPublicKey) {
      console.log('[CLIENT-KEY] Using existing key pair from localStorage');
      return {
        publicKey: storedPublicKey,
        privateKey: storedPrivateKey
      };
    }
    
    // Generate a new key pair
    console.log('[CLIENT-KEY] No existing key pair found, generating new one');
    const keyPair = await generateKeyPair();
    
    // Store the keys
    localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, keyPair.privateKey);
    localStorage.setItem(PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);
    
    return keyPair;
  } catch (error) {
    console.error('[CLIENT-KEY] Error in getOrCreateClientKeyPair:', error);
    throw error;
  }
}

/**
 * Sign a message using the client's private key
 * @param {string} message - The message to sign
 * @returns {Promise<string>} Base64 encoded signature
 */
export async function signMessage(message) {
  try {
    const privateKeyPem = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKeyPem) {
      throw new Error('No private key available');
    }
    
    // Import the private key
    const privateKey = await importKeyFromPem(privateKeyPem, true);
    
    // Convert the message to an ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Sign the message
    const signature = await subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      privateKey,
      data
    );
    
    // Convert the signature to Base64
    return arrayBufferToBase64(signature);
  } catch (error) {
    console.error('[CLIENT-KEY] Error signing message:', error);
    throw error;
  }
}

/**
 * Get the client's public key
 * @returns {string|null} The public key in PEM format, or null if not found
 */
export function getClientPublicKey() {
  return localStorage.getItem(PUBLIC_KEY_STORAGE_KEY);
}

/**
 * Register the client's public key with the VPS
 * @param {string} vpsUrl - The base URL of the VPS (without the ws:// prefix)
 * @param {string} clientId - The client's unique ID
 * @param {string} boatId - The boat ID to associate with this key
 * @returns {Promise<boolean>} True if registration was successful
 */
export async function registerClientKeyWithVPS(vpsUrl, clientId, boatId) {
  try {
    // Get the public key
    const publicKey = getClientPublicKey();
    if (!publicKey) {
      throw new Error('No public key available');
    }
    
    // Extract hostname from the WebSocket URL and determine protocol
    let hostname;
    let protocol;
    
    // Check if it's a secure WebSocket URL (wss://)
    const secureMatch = vpsUrl.match(/^wss:\/\/([^:/]+)/i);
    if (secureMatch) {
      hostname = secureMatch[1];
      protocol = 'https';
    } else {
      // Try to match non-secure WebSocket URL (ws://)
      const insecureMatch = vpsUrl.match(/^ws:\/\/([^:/]+)/i);
      if (insecureMatch) {
        hostname = insecureMatch[1];
        protocol = 'http';
      } else {
        throw new Error(`Invalid WebSocket URL format: ${vpsUrl}`);
      }
    }
    
    const apiBaseUrl = `${protocol}://${hostname}`;
    console.log(`[CLIENT-KEY] API base URL: ${apiBaseUrl}`);
    
    const registrationUrl = `${apiBaseUrl}/api/client/register-key`;
    console.log(`[CLIENT-KEY] Registering public key with VPS at ${registrationUrl}`);
    
    // Create a timeout promise
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000);
    });
    
    // Create the fetch promise
    const fetchPromise = fetch(registrationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId,
        boatId,
        publicKey
      })
    });
    
    // Race the fetch against the timeout
    const response = await Promise.race([fetchPromise, timeout]);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`[CLIENT-KEY] Successfully registered public key with VPS for client ${clientId}`);
      return true;
    } else {
      console.error(`[CLIENT-KEY] Failed to register public key with VPS: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.error('[CLIENT-KEY] Error registering public key with VPS:', error);
    return false;
  }
}
