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
let cachedLoggingPrefs = { ...DEFAULT_LOGGING_PREFS };

// Format log arguments
function formatLogArgs(args) {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      try {
        // Handle circular references
        const cache = new Set();
        return JSON.parse(JSON.stringify(arg, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) return '[Circular]';
            cache.add(value);
          }
          return value;
        }));
      } catch (e) {
        return `[Error formatting: ${e.message}`;
      }
    }
    return arg;
  });
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
      
      // Format the message and arguments
      const formattedArgs = formatLogArgs([message, ...args]);
      const formattedMessage = formattedArgs.shift();
      
      // Get the appropriate console method
      const consoleMethod = {
        debug: console.debug,
        info: console.info,
        warn: console.warn,
        error: console.error,
        data: console.debug,
        log: console.log
      }[effectiveLevel] || console.log;
      
      // Prepare log arguments with namespace prefix
      const logArgs = [];
      if (formattedMessage !== undefined) {
        logArgs.push(`[${fullNamespace}]`, formattedMessage, ...formattedArgs);
      } else {
        logArgs.push(`[${fullNamespace}]`, ...formattedArgs);
      }
      
      // Filter out empty arguments
      const nonEmptyArgs = logArgs.filter(arg => arg !== undefined && arg !== '');
      
      // Get the call site information
      const getCallerLocation = () => {
        try {
          const stack = new Error().stack || '';
          const stackLines = stack.split('\n');
          // Find the first line that's not from the logger
          const callerLine = stackLines.find(line => 
            !line.includes('logger.fixed.js') && 
            !line.includes('node_modules') &&
            line.trim() !== ''
          ) || '';
          
          // Extract file and line number
          const match = callerLine.match(/at\s+(.+):(\d+):(\d+)/) || [];
          return match[1] ? `\n  at ${match[1]}:${match[2]}` : '';
        } catch (e) {
          return '';
        }
      };
      
      // Add call site in development
      if (process.env.NODE_ENV === 'development') {
        nonEmptyArgs.push(getCallerLocation());
      }
      
      // Call the console method with the correct call site
      consoleMethod.apply(console, nonEmptyArgs);
      
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
