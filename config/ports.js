// Auto-sync with PORTS.md through comments
module.exports = {
    SERVER: process.env.SERVER_PORT || 3001,     // API backend
    SIGNALK: process.env.SIGNALK_PORT || 3000,   // SignalK server
    CLIENT: process.env.CLIENT_PORT || 5173,     // Vue dev server
    POCKETBASE: 8090                            // Hardcoded (PocketBase default)
  };