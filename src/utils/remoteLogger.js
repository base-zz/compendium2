/**
 * Remote Logger
 * 
 * Utility for capturing logs and sending them to a remote server,
 * with graceful degradation when the server is unavailable.
 */

// Configuration
const CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
  REQUEST_TIMEOUT: 3000, // 3 seconds
  MAX_LOGS: 200,
  FLUSH_INTERVAL: 10000, // 10 seconds
};

// In-memory queue for logs
let logQueue = [];
let isSending = false;
let retryCount = 0;
let flushInterval = null;

// Helper to get server URL with fallback
const getServerUrl = () => {
  return import.meta.env.VITE_VPS_API_URL || 'https://compendiumnav.com';
};

// Process the log queue
const processQueue = async () => {
  if (!isRemoteLoggingEnabled()) {
    logQueue = [];
    retryCount = 0;
    return;
  }

  if (isSending || logQueue.length === 0) return;
  
  isSending = true;
  const logsToSend = [...logQueue];
  
  try {
    const serverUrl = getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
    
    const response = await fetch(`${serverUrl}/api/client-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: localStorage.getItem('clientId') || 'unknown',
        logs: logsToSend,
        timestamp: Date.now(),
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Remove sent logs from queue
      logQueue = logQueue.slice(logsToSend.length);
      retryCount = 0; // Reset retry counter on success
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.warn('Failed to send logs to server:', error.message);
    retryCount++;
    
    // Schedule a retry if we haven't exceeded max retries
    if (retryCount <= CONFIG.MAX_RETRIES) {
      setTimeout(processQueue, CONFIG.RETRY_DELAY * retryCount);
    } else {
      // If we've exceeded retries, keep the logs but cap the queue size
      if (logQueue.length > CONFIG.MAX_LOGS * 2) {
        logQueue = logQueue.slice(-CONFIG.MAX_LOGS);
      }
    }
  } finally {
    isSending = false;
  }
};

// Initialize the logger
export const remoteLogger = {
  // Add a log entry - this should only be called for remote logging
  // Note: Preference checking is handled by the logger
  log(category, message, data = null) {
    // At this point, we assume the logger has already checked preferences
    // and we can proceed with remote logging
    
    // Handle undefined or null message
    if (message === undefined || message === null) {
      message = '[No message]';
    }
    
    // Helper function to safely stringify objects
    const safeStringify = (obj) => {
      if (obj === undefined || obj === null) return null;
      const seen = new WeakSet();
      try {
        return JSON.stringify(obj, (key, value) => {
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
          }
          return value;
        }, 2);
      } catch (e) {
        return `[Error stringifying: ${e.message}`;
      }
    };
    
    // Prepare the log entry for remote logging
    let logData = null;
    try {
      logData = data !== undefined && data !== null ? 
        (typeof data === 'object' ? safeStringify(data) : String(data)) : 
        null;
      if (logData) JSON.parse(logData); // Test if it's valid JSON
    } catch (e) {
      logData = `[Invalid data: ${e.message}`;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message: typeof message === 'string' ? message : safeStringify(message) || '[No message]',
      data: logData,
      clientTime: Date.now(),
    };
    
    // Add to remote queue if we're online
    if (!isRemoteLoggingEnabled()) {
      return;
    }

    if (navigator.onLine) {
      logQueue.push(logEntry);
      
      // Trim queue if it gets too large
      if (logQueue.length > CONFIG.MAX_LOGS) {
        logQueue = logQueue.slice(-CONFIG.MAX_LOGS);
      }
      
      // Process queue if not already processing
      if (!isSending) {
        processQueue();
      }
    }
  },
  
  // Manually flush the log queue
  flush: processQueue,
  
  // Initialize automatic flushing
  init() {
    if (!flushInterval) {
      flushInterval = setInterval(() => {
        if (!isRemoteLoggingEnabled()) {
          logQueue = [];
          retryCount = 0;
          return;
        }

        if (navigator.onLine && logQueue.length > 0) {
          processQueue();
        }
      }, CONFIG.FLUSH_INTERVAL);
      
      // Also flush when coming back online
      window.addEventListener('online', processQueue);
    }
  },
  
  // Clean up
  destroy() {
    if (flushInterval) {
      clearInterval(flushInterval);
      flushInterval = null;
    }
    window.removeEventListener('online', processQueue);
  },
};

// Initialize the logger when this module is loaded
if (typeof window !== 'undefined') {
  remoteLogger.init();
}

function isRemoteLoggingEnabled() {
  try {
    const rawPreferences = localStorage.getItem('userPreferences');
    if (!rawPreferences) {
      return false;
    }

    const parsed = JSON.parse(rawPreferences);
    return Boolean(parsed?.logging?.remote);
  } catch {
    return false;
  }
}
