import log from 'loglevel';

/**
 * Get the caller's file and line number
 * @returns {string} Formatted string with file and line number
 */
function getCallerInfo() {
  // Temporarily enabled in all environments for testing
  // if (import.meta.env.PROD) return '';

  try {
    // Create a new error to capture the stack trace
    const err = new Error();
    if (!err.stack) return '';
    
    // Get the stack trace lines
    const stack = err.stack.split('\n');
    
    // Look for the first non-logger related line in the stack trace
    for (let i = 0; i < stack.length; i++) {
      const line = stack[i].trim();
      
      // Skip any lines that are part of the logger implementation
      if (line.includes('logger.js')) continue;
      
      // Try to match the stack trace format in your environment
      // Example: "at Proxy.<anonymous> (http://compendium.local:5176/src/App.vue:123:45)"
      const match = line.match(/at\s+(?:\S+\s+)?\(?([^)]+\/([^/?:]+)(?:\?[^:]*)?):(\d+):(\d+)\)?/);
      
      if (match) {
        const [, , fileName, lineNum] = match;
        return `[${fileName}:${lineNum}]`;
      }
      
      // Try a more general pattern as fallback
      const generalMatch = line.match(/([^/\\?]+)(?:\?[^:]*)?:(\d+):(\d+)/);
      if (generalMatch) {
        const [, fileName, lineNum] = generalMatch;
        return `[${fileName}:${lineNum}]`;
      }
    }
  } catch (e) {
    // Don't log the error to avoid infinite loops
    return '';
  }
}

// Lazy import for preferences store to avoid circular dependencies
let preferencesStorePromise = null;

async function getPreferencesStore() {
  if (!preferencesStorePromise) {
    preferencesStorePromise = import('../stores/preferences.js')
      .then(({ usePreferencesStore }) => usePreferencesStore());
  }
  return preferencesStorePromise;
}

// Default logging preferences
const DEFAULT_LOGGING_PREFS = {
  debug: false,
  info: true,
  warn: true,
  error: true,
  data: false,
  remote: false
};

// Cache for logging preferences
const cachedLoggingPrefs = { ...DEFAULT_LOGGING_PREFS };

// Format object arguments to handle circular references
function formatObject(obj) {
  try {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return obj;
    
    // Handle circular references
    const cache = new Set();
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.has(value)) return '[Circular]';
        cache.add(value);
      }
      return value;
    }));
  } catch (e) {
    return `[Error formatting: ${e.message}]`;
  }
}

// Check if logging is enabled for a specific level and namespace
async function isLoggingEnabled(level, namespace) {
  // Default to true for error and warn levels if we can't access preferences
  if (level === 'error' || level === 'warn') {
    return true;
  }
  
  // For other levels, check preferences if available
  try {
    const preferencesStore = await getPreferencesStore();
    // If we got here, Pinia is available
    const prefs = preferencesStore.logging || {};
    
    // Check if logging is enabled for this level and namespace
    return prefs[level] !== false && 
           (!namespace || !prefs.disabledNamespaces?.includes(namespace));
  } catch (error) {
    // If we can't access preferences (Pinia not initialized), use safe defaults
    if (level === 'debug' || level === 'data') {
      return false; // Disable debug/data logs by default when Pinia isn't available
    }
    return true; // Enable info/warn/error logs by default
  }
}

// Create a logger with the given namespace
export function createLogger(namespace) {
  const fullNamespace = `app:${namespace}`;
  const logger = log.getLogger(fullNamespace);
  
  // Default to info level
  logger.setDefaultLevel('info');
  
  // Create a proxy to handle the logging
  const proxyLogger = new Proxy({}, {
    get(target, level) {
      // Handle log levels and custom methods
      if (['trace', 'debug', 'info', 'warn', 'error', 'data'].includes(level)) {
        return async (message, ...args) => {
          try {
            const isEnabled = await isLoggingEnabled(level, namespace);
            if (!isEnabled) return;
            
            // Format the arguments
            const processedArgs = args.map(arg => 
              typeof arg === 'object' ? formatObject(arg) : arg
            );
            
            // Format the message with namespace and caller info
            const callerInfo = getCallerInfo();
            const formattedMessage = `[${fullNamespace}] ${callerInfo}${message}`;
            
            // Use the appropriate loglevel method
            if (level === 'data') {
              // For data level, use debug but with our own formatting
              logger.debug(formattedMessage, ...processedArgs);
              
              // Also send to remote logger if enabled and available
              if (window.remoteLogger && cachedLoggingPrefs.remote) {
                try {
                  window.remoteLogger.log({
                    level: 'data',
                    message: formattedMessage,
                    args: processedArgs
                  });
                } catch (e) {
                  console.warn('Failed to send log to remote:', e);
                }
              }
            } else {
              // For standard levels, use the appropriate method
              logger[level](formattedMessage, ...processedArgs);
            }
          } catch (error) {
            // Fallback to console if something goes wrong
            console[level === 'warn' || level === 'error' ? level : 'log'](
              `[${fullNamespace}] [${level}]`,
              message,
              ...args
            );
          }
        };
      }
      
      // Default to info for any other method calls
      return logger[level] || logger.info;
    }
  });
  
  return proxyLogger;
}

// Create a lazy logger that will be initialized when first used
let defaultLogger = null;

/**
 * Get the default logger instance (lazy-loaded)
 * @returns {import('./logger').Logger} The default logger instance
 */
export function getLogger() {
  if (!defaultLogger) {
    defaultLogger = createLogger('default');
    
    // Enable debug logging in development
    if (import.meta.env.DEV) {
      log.setLevel('debug');
    }
  }
  return defaultLogger;
}

// Create a proxy that will use the lazy logger and support both direct and method calls
const logger = new Proxy({}, {
  get(target, prop) {
    // Delegate all property access to the lazy logger
    const logger = getLogger();
    if (prop in logger) {
      const value = logger[prop];
      return typeof value === 'function' ? value.bind(logger) : value;
    }
    return undefined;
  },
  // Support direct function calls (logger('message'))
  apply(target, thisArg, args) {
    const logger = getLogger();
    return logger.info(...args);
  }
});

// Export loglevel's methods for direct access
export const { trace, debug, info, warn, error } = log;

// Export everything
export default logger;
