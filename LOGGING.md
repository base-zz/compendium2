# Logging System Guide

This document explains how to use the application's logging system for debugging and monitoring.

## Table of Contents
- [Logging Levels](#logging-levels)
- [Console Logging](#console-logging)
- [Remote Logging](#remote-logging)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Logging Levels

The application uses the following log levels:

| Level  | Description | Default Remote | Console Command |
|--------|-------------|----------------|-----------------|
| debug  | Detailed debug information | ❌ Disabled | `logger.debug()` |
| data   | Data flow and state changes | ❌ Disabled | `logger.data()` |
| info   | General application information | ✅ Enabled | `logger.info()` |
| warn   | Warnings that don't break functionality | ✅ Enabled | `logger.warn()` |
| error  | Errors that need attention | ✅ Enabled | `logger.error()` |

## Console Logging

### Enabling Console Logs

1. **All Logs**
   ```javascript
   localStorage.debug = '*';
   ```

2. **Specific Namespace**
   ```javascript
   // Example: Enable all logs from state data store
   localStorage.debug = 'app:state-data-store:*';
   
   // Example: Enable only data logs from state data store
   localStorage.debug = 'app:state-data-store:data';
   ```

3. **Multiple Namespaces**
   ```javascript
   localStorage.debug = 'app:state-data-store:*,app:relay:*';
   ```

4. **Disable All Console Logs**
   ```javascript
   localStorage.removeItem('debug');
   // or
   localStorage.debug = '';
   ```

### Common Namespaces

- `app:state-data-store:*` - State management logs
- `app:relay:*` - WebSocket relay connection logs
- `app:smart-connection:*` - Connection management logs
- `app:api:*` - API request/response logs

## Remote Logging

Remote logging is enabled by default for `info`, `warn`, and `error` levels. For `data` and `debug` levels, it must be explicitly enabled.

### Enabling Remote Logs for Data

```javascript
import { createLogger } from './services/logger';

const logger = createLogger('your-component');

// Enable remote logging for data logs
logger.data.setRemoteLogging(true);

// Now data logs will be sent to the remote server
logger.data('This will be sent to remote server');

// Disable remote logging
logger.data.setRemoteLogging(false);
```

## Using Loggers in Code

### Creating a Logger

```javascript
import { createLogger } from './services/logger';

// Create a logger for your component
const logger = createLogger('your-component');

// Usage
export function yourFunction() {
  logger.debug('Debug information');
  logger.data('Data flow information');
  logger.info('Informational message');
  logger.warn('Warning message');
  logger.error('Error message', { error: errorObject });
}
```

### Logging Best Practices

1. **Use Appropriate Log Levels**
   - `debug`: For detailed debugging information
   - `data`: For data flow and state changes
   - `info`: For general operational information
   - `warn`: For handled exceptions or warnings
   - `error`: For errors that need attention

2. **Structured Logging**
   ```javascript
   // Good
   logger.info('User logged in', { userId: user.id, role: user.role });
   
   // Avoid
   logger.info(`User ${user.id} with role ${user.role} logged in`);
   ```

3. **Error Logging**
   ```javascript
   try {
     // Your code
   } catch (error) {
     logger.error('Operation failed', { 
       error: error.message,
       stack: error.stack,
       context: { /* additional context */ }
     });
   }
   ```

## Troubleshooting

### Logs Not Appearing
1. Check if the namespace is correctly enabled in `localStorage.debug`
2. Verify there are no typos in the namespace
3. Ensure the log level is appropriate for the message

### Remote Logs Not Being Sent
1. Check network connectivity
2. Verify the remote logging endpoint is correctly configured
3. Ensure the log level is enabled for remote logging

### Too Many Logs
1. Use more specific namespaces
2. Disable debug/data logs in production
3. Use appropriate log levels for each message
