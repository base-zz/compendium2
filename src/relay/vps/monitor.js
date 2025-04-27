/**
 * VPS Relay Proxy Monitoring System
 * 
 * This module provides real-time monitoring of the VPS Relay Proxy
 * through event handlers. It tracks connections, performance metrics,
 * and system health.
 */

import fs from 'fs';
import path from 'path';
import { vpsRelayProxy } from './VPSRelayProxy.js';

class RelayMonitor {
  constructor(config = {}) {
    this.config = {
      // How often to save performance data to disk (ms)
      saveInterval: 300000, // 5 minutes
      
      // Maximum history entries to keep in memory
      maxHistoryEntries: 1440, // 24 hours of minute data
      
      // Directory to store logs
      logDir: path.join(__dirname, 'logs'),
      
      // Whether to log to console
      consoleLog: true,
      
      ...config
    };
    
    // Performance metrics
    this.lastStats = { 
      messagesSent: 0, 
      messagesReceived: 0,
      timestamp: Date.now() 
    };
    
    this.performanceHistory = [];
    
    // Connection tracking
    this.connectionStats = {
      totalConnections: 0,
      totalDisconnections: 0,
      currentConnections: 0,
      connectionsByHour: Array(24).fill(0),
      peakConnections: 0,
      lastConnectionTime: null,
      authFailures: new Map() // IP -> count
    };
    
    // Ensure log directory exists
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
    
    // Initialize
    this._setupEventHandlers();
    this._setupPeriodicTasks();
    
    this.log('Monitor', 'Monitoring system initialized');
  }
  
  /**
   * Set up event handlers for the VPS Relay Proxy
   */
  _setupEventHandlers() {
    // Only set up handlers if vpsRelayProxy is initialized
    if (!vpsRelayProxy.EVENTS) {
      this.log('Error', 'VPS Relay Proxy not initialized with events');
      return;
    }
    
    // Client connection events
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.CLIENT.CONNECTED, (data) => {
      this.connectionStats.totalConnections++;
      this.connectionStats.currentConnections = data.totalClients;
      this.connectionStats.lastConnectionTime = data.timestamp;
      
      // Update peak connections if needed
      if (data.totalClients > this.connectionStats.peakConnections) {
        this.connectionStats.peakConnections = data.totalClients;
      }
      
      // Update hourly stats
      const hour = new Date(data.timestamp).getHours();
      this.connectionStats.connectionsByHour[hour]++;
      
      this.log('Connection', `Client ${data.clientId} connected from ${data.ip}. Total: ${data.totalClients}`);
    });
    
    // Client disconnection events
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.CLIENT.DISCONNECTED, (data) => {
      this.connectionStats.totalDisconnections++;
      this.connectionStats.currentConnections = data.remainingClients;
      
      this.log('Connection', `Client ${data.clientId} disconnected. Remaining: ${data.remainingClients}`);
    });
    
    // Authentication failures
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.CLIENT.ERROR, (data) => {
      if (data.type === 'auth_failed') {
        // Increment failure count for this IP
        const count = (this.connectionStats.authFailures.get(data.ip) || 0) + 1;
        this.connectionStats.authFailures.set(data.ip, count);
        
        this.log('Security', `Auth failure from ${data.ip} (attempt ${count})`);
        
        // Alert on suspicious activity
        if (count >= 5) {
          this.log('Security', `⚠️ Potential brute force from ${data.ip}`, 'warning');
        }
      }
    });
    
    // Relay server connection events
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.RELAY.CONNECTED, (data) => {
      this.log('Relay', `Connected to relay server at ${data.url}`);
    });
    
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.RELAY.DISCONNECTED, (data) => {
      this.log('Relay', `⚠️ Disconnected from relay server: ${data.reason}`, 'warning');
    });
    
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.RELAY.RECONNECTING, (data) => {
      this.log('Relay', `Reconnecting to relay server (${data.attempt}/${data.maxAttempts})`);
    });
    
    // System stats events
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.SYSTEM.STATS_UPDATED, (stats) => {
      this._processPerformanceStats(stats);
    });
    
    // System shutdown
    vpsRelayProxy.on(vpsRelayProxy.EVENTS.SYSTEM.SHUTDOWN, (data) => {
      this.log('System', `Shutting down after ${data.uptime}s uptime with ${data.activeClients} clients`);
      this._savePerformanceHistory();
    });
  }
  
  /**
   * Set up periodic tasks
   */
  _setupPeriodicTasks() {
    // Save performance history periodically
    setInterval(() => {
      this._savePerformanceHistory();
    }, this.config.saveInterval);
    
    // Reset auth failure counts every hour
    setInterval(() => {
      this.connectionStats.authFailures.clear();
    }, 3600000);
  }
  
  /**
   * Process performance stats update
   */
  _processPerformanceStats(stats) {
    // Calculate rates since last update
    const timeDiff = (stats.timestamp - this.lastStats.timestamp) / 1000; // in seconds
    const messagesSentRate = timeDiff > 0 
      ? (stats.messagesSent - this.lastStats.messagesSent) / timeDiff 
      : 0;
    const messagesReceivedRate = timeDiff > 0 
      ? (stats.messagesReceived - this.lastStats.messagesReceived) / timeDiff 
      : 0;
    
    // Create performance entry
    const perfEntry = {
      timestamp: stats.timestamp,
      clients: stats.clients.length,
      messagesSentRate,
      messagesReceivedRate,
      messagesSentTotal: stats.messagesSent,
      messagesReceivedTotal: stats.messagesReceived
    };
    
    // Add to history
    this.performanceHistory.push(perfEntry);
    
    // Keep history to reasonable size
    if (this.performanceHistory.length > this.config.maxHistoryEntries) {
      this.performanceHistory.shift();
    }
    
    // Update last stats
    this.lastStats = {
      messagesSent: stats.messagesSent,
      messagesReceived: stats.messagesReceived,
      timestamp: stats.timestamp
    };
    
    // Log current performance
    this.log('Performance', `Messages/sec: ${messagesSentRate.toFixed(2)} sent, ${messagesReceivedRate.toFixed(2)} received. Clients: ${stats.clients.length}`);
  }
  
  /**
   * Save performance history to disk
   */
  _savePerformanceHistory() {
    if (this.performanceHistory.length === 0) {
      return;
    }
    
    try {
      const now = new Date();
      const filename = `performance_${now.toISOString().split('T')[0]}.json`;
      const filePath = path.join(this.config.logDir, filename);
      
      // If file exists, read and merge with current data
      let existingData = [];
      if (fs.existsSync(filePath)) {
        existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      
      // Merge data, avoiding duplicates by timestamp
      const timestamps = new Set(existingData.map(entry => entry.timestamp));
      const newData = [
        ...existingData,
        ...this.performanceHistory.filter(entry => !timestamps.has(entry.timestamp))
      ];
      
      // Sort by timestamp
      newData.sort((a, b) => a.timestamp - b.timestamp);
      
      // Write to file
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      
      this.log('System', `Saved performance history (${this.performanceHistory.length} entries)`);
    } catch (error) {
      this.log('Error', `Failed to save performance history: ${error.message}`, 'error');
    }
  }
  
  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    // Calculate averages from recent history
    const recentHistory = this.performanceHistory.slice(-10); // Last 10 entries
    
    if (recentHistory.length === 0) {
      return {
        messagesSentRate: 0,
        messagesReceivedRate: 0,
        averageClients: 0,
        timestamp: Date.now()
      };
    }
    
    const avgSentRate = recentHistory.reduce((sum, entry) => sum + entry.messagesSentRate, 0) / recentHistory.length;
    const avgReceivedRate = recentHistory.reduce((sum, entry) => sum + entry.messagesReceivedRate, 0) / recentHistory.length;
    const avgClients = recentHistory.reduce((sum, entry) => sum + entry.clients, 0) / recentHistory.length;
    
    return {
      messagesSentRate: avgSentRate,
      messagesReceivedRate: avgReceivedRate,
      averageClients: avgClients,
      peakClients: this.connectionStats.peakConnections,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get connection statistics
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      authFailures: Array.from(this.connectionStats.authFailures.entries())
    };
  }
  
  /**
   * Log a message
   */
  log(category, message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${category}] [${level.toUpperCase()}] ${message}`;
    
    // Console logging if enabled
    if (this.config.consoleLog) {
      console.log(logEntry);
    }
    
    // File logging
    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.config.logDir, `relay_${today}.log`);
      
      fs.appendFileSync(logFile, logEntry + '\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }
}

// Create and export a singleton instance
const relayMonitor = new RelayMonitor();

export { relayMonitor };
