/**
 * Client Key Pair Management
 * 
 * Handles generating, storing, and using RSA key pairs for client authentication
 * with the VPS Relay Proxy.
 * Uses node-forge for cryptographic operations to work in non-secure contexts.
 */

import forge from 'node-forge';

// Constants for key storage
const PRIVATE_KEY_STORAGE_KEY = 'client_private_key';
const PUBLIC_KEY_STORAGE_KEY = 'client_public_key';


/**
 * Generate a new RSA key pair
 * @returns {Promise<Object>} Object containing publicKey and privateKey in PEM format
 */
async function generateKeyPair() {
  try {
    console.log('[CLIENT-KEY] Generating new RSA key pair using node-forge');
    
    // Generate the key pair using node-forge
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
    
    // Convert to PEM format
    const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
    const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
    
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
 * @throws {Error} If signing fails
 */
export async function signMessage(message) {
  try {
    // Get the stored private key
    const privateKeyPem = localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    if (!privateKeyPem) {
      throw new Error('No private key found for signing');
    }

    // Import the private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    
    // Create a message digest and sign it
    const md = forge.md.sha256.create();
    md.update(message, 'utf8');
    
    // Sign the message
    const signature = privateKey.sign(md);
    
    // Return the signature as Base64
    return forge.util.encode64(signature);
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
    const publicKey = getClientPublicKey();
    if (!publicKey) {
      console.error('[CLIENT-KEY] No public key available for registration');
      return false;
    }

    // Extract hostname and port from vpsUrl, handling both ws:// and wss://
    const hostname = vpsUrl.replace(/^wss?:\/\//, '').split('/')[0];
    const protocol = vpsUrl.startsWith('wss:') ? 'https' : 'http';
    
    // Construct the API URL - using the correct endpoint for client key registration
    const apiUrl = `${protocol}://${hostname}/api/client/register-key`;
    console.log(`[CLIENT-KEY] Registering public key with VPS at ${apiUrl}`);
    
    // Create a timeout promise
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000);
    });
    
    // Create the fetch promise
    const fetchPromise = fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        clientId,
        boatId,
        publicKey: publicKey.replace(/\n/g, '')
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
