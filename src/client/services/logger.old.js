import { remoteLogger } from '../utils/remoteLogger.js';

// Lazy import for preferences store to avoid circular dependencies
let preferencesStorePromise = null;

async function getPreferencesStore() {
  if (!preferencesStorePromise) {
    preferencesStorePromise = import('../stores/preferences.js')
      .then(({ usePreferencesStore }) => usePreferencesStore());
  }
  return preferencesStorePromise;
}

// Valid log levels
const VALID_LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'data'];

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
  try {
    const store = await getPreferencesStore();
    const prefs = store.preferences?.logging || {};
    
    // Check if this specific level is disabled
    if (prefs[level] === false) {
      return false;
    }
    
    // Check namespace filters if any
    if (Array.isArray(prefs.namespaces) && prefs.namespaces.length > 0) {
      return prefs.namespaces.some(filter => {
        const regex = new RegExp(`^${filter.replace(/\*/g, '.*')}$`);
        return regex.test(namespace);
      });
    }
    
    return true;
  } catch (error) {
    console.warn('Failed to check logging preferences:', error);
    return true; // Default to enabled on error
  }
}

// Create a logger with the given namespace
export function createLogger(namespace) {
  const fullNamespace = `app:${namespace}`;
  
  // The main logger function
  const logger = (level, message, ...args) => {
    // Get the effective log level (default to 'info' for non-standard levels)
    const effectiveLevel = VALID_LOG_LEVELS.includes(level) ? level : 'info';
    
    // Check if logging is enabled for this level and namespace
    isLoggingEnabled(effectiveLevel, namespace).then(isEnabled => {
      if (!isEnabled) return;
      
      // Format the arguments for better display
      const processedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          return formatObject(arg);
        }
        return arg;
      });
      
      // Create a formatted message
      const formattedMessage = message !== undefined && message !== null && message !== '' 
        ? `[${fullNamespace}] ${message}` 
        : `[${fullNamespace}]`;
      
      // Get the current file and line number
      // Always get the caller information
      let callerInfo = '';
      try {
        const error = new Error();
        const stackLines = error.stack.split('\n');
        
        // Find the first line that's not from logger.js
        for (let i = 1; i < stackLines.length; i++) {
          const line = stackLines[i];
          if (!line.includes('logger.js')) {
            // Try different regex patterns to match the file and line number
            let match = line.match(/at.*[/\\]([^/\\]+):(\d+)/);
            if (!match) {
              match = line.match(/at\s+(.+?):(\d+)/);
            }
            if (match) {
              // Get just the filename without path
              const filename = match[1].split('/').pop().split('\\').pop();
              callerInfo = ` (${filename}:${match[2]})`;
              break;
            }
          }
        }
        
        // If we couldn't extract caller info, use a default
        if (!callerInfo) {
          callerInfo = ' (unknown source)';
        }
        
        // Map log levels to valid console methods
        const consoleMethod = {
          debug: console.debug,
          info: console.info,
          warn: console.warn,
          error: console.error,
          data: console.debug // Map 'data' to debug
        }[level] || console.log; // Default to console.log for unknown levels
        
        // Use the appropriate console method
        consoleMethod(`${formattedMessage}${callerInfo}`, ...processedArgs);
      } catch (e) {
        // Fallback if stack trace parsing fails
        console.log(formattedMessage, ...processedArgs);
      }
      
      // Handle remote logging if enabled
      if (cachedLoggingPrefs.remote) {
        try {
          remoteLogger.log(fullNamespace, message, args.length ? args : undefined);
        } catch (error) {
          console.error('[Logger] Error in remote logger:', error);
        }
      }
    }).catch(error => {
      console.error('[Logger] Error checking logging preferences:', error);
    });
  };
  
  // Create log level methods
  logger.debug = (message, ...args) => logger('debug', message, ...args);
  logger.info = (message, ...args) => logger('info', message, ...args);
  logger.warn = (message, ...args) => logger('warn', message, ...args);
  logger.error = (message, ...args) => logger('error', message, ...args);
  logger.data = (message, ...args) => logger('data', message, ...args);
  
  // Method to check if a specific log level is enabled
  logger.isEnabled = (level) => isLoggingEnabled(level, fullNamespace);
  
  // Method to wait for the logger to be ready
  logger.ready = () => getPreferencesStore().then(() => true).catch(() => true);
  
  return logger;
}

// Initialize debug logging on import
if (typeof window !== 'undefined') {
  // Enable debug logging in development or if explicitly enabled in localStorage
  if (process.env.NODE_ENV === 'development' || localStorage.debug) {
    localStorage.debug = localStorage.debug || '*';
  }
}

export default {
  createLogger,
  // Export for backward compatibility
  enableDebug: () => { localStorage.debug = '*'; }
};
