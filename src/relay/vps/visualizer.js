/**
 * VPS Relay Proxy Performance Visualizer
 * 
 * This module provides a simple web interface to visualize performance data
 * collected by the monitor. It helps identify patterns and optimize sync strategies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { relayMonitor } = require('./monitor');

class PerformanceVisualizer {
  constructor(config = {}) {
    this.config = {
      port: 3004,
      host: 'localhost',
      dataRefreshInterval: 5000, // 5 seconds
      ...config
    };
    
    this.server = null;
  }
  
  /**
   * Start the visualization server
   */
  start() {
    this.server = http.createServer((req, res) => {
      // Handle API requests
      if (req.url.startsWith('/api/')) {
        return this._handleApiRequest(req, res);
      }
      
      // Serve the main HTML page for all other requests
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this._generateHtml());
    });
    
    this.server.listen(this.config.port, this.config.host, () => {
      console.log(`[VISUALIZER] Performance visualizer started at http://${this.config.host}:${this.config.port}`);
    });
  }
  
  /**
   * Stop the visualization server
   */
  stop() {
    if (this.server) {
      this.server.close();
      console.log('[VISUALIZER] Performance visualizer stopped');
    }
  }
  
  /**
   * Handle API requests
   */
  _handleApiRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    
    // Get current performance data
    if (req.url === '/api/current') {
      const data = {
        performance: relayMonitor.getPerformanceMetrics(),
        connections: relayMonitor.getConnectionStats()
      };
      
      res.writeHead(200);
      res.end(JSON.stringify(data));
      return;
    }
    
    // Get historical performance data
    if (req.url === '/api/history') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const filePath = path.join(relayMonitor.config.logDir, `performance_${today}.json`);
        
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          res.writeHead(200);
          res.end(JSON.stringify(data));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify([]));
        }
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }
    
    // Unknown API endpoint
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
  
  /**
   * Generate the HTML for the visualization page
   */
  _generateHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VPS Relay Performance Monitor</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f7;
    }
    
    h1, h2, h3 {
      color: #1d1d1f;
    }
    
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .card {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .metric {
      font-size: 2rem;
      font-weight: bold;
      margin: 10px 0;
      color: #0066cc;
    }
    
    .metric-label {
      font-size: 0.9rem;
      color: #666;
      text-transform: uppercase;
    }
    
    .chart-container {
      background: white;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 30px;
      height: 400px;
    }
    
    .connection-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    .connection-table th, .connection-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    .connection-table th {
      background-color: #f2f2f2;
    }
    
    .refresh-time {
      font-size: 0.8rem;
      color: #666;
      text-align: right;
      margin-top: 10px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .btn {
      background-color: #0066cc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    
    .btn:hover {
      background-color: #004499;
    }
  </style>
  <!-- Include Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="header">
    <h1>VPS Relay Performance Monitor</h1>
    <button id="refreshBtn" class="btn">Refresh Now</button>
  </div>
  
  <div class="dashboard">
    <div class="card">
      <div class="metric-label">Active Clients</div>
      <div id="activeClients" class="metric">-</div>
      <div class="metric-label">Peak: <span id="peakClients">-</span></div>
    </div>
    
    <div class="card">
      <div class="metric-label">Messages Sent/sec</div>
      <div id="messagesSentRate" class="metric">-</div>
    </div>
    
    <div class="card">
      <div class="metric-label">Messages Received/sec</div>
      <div id="messagesReceivedRate" class="metric">-</div>
    </div>
    
    <div class="card">
      <div class="metric-label">Total Connections</div>
      <div id="totalConnections" class="metric">-</div>
      <div class="metric-label">Disconnections: <span id="totalDisconnections">-</span></div>
    </div>
  </div>
  
  <div class="chart-container">
    <h2>Message Rate Over Time</h2>
    <canvas id="messageRateChart"></canvas>
  </div>
  
  <div class="chart-container">
    <h2>Client Connections Over Time</h2>
    <canvas id="clientsChart"></canvas>
  </div>
  
  <div class="card">
    <h2>Connection Distribution by Hour</h2>
    <canvas id="hourlyChart"></canvas>
  </div>
  
  <div class="card">
    <h2>Recent Authentication Failures</h2>
    <table class="connection-table" id="authFailuresTable">
      <thead>
        <tr>
          <th>IP Address</th>
          <th>Failure Count</th>
        </tr>
      </thead>
      <tbody>
        <!-- Will be populated by JavaScript -->
      </tbody>
    </table>
  </div>
  
  <div class="refresh-time">Last updated: <span id="lastUpdated">-</span></div>
  
  <script>
    // Charts
    let messageRateChart;
    let clientsChart;
    let hourlyChart;
    
    // Data
    let historyData = [];
    
    // Initialize the dashboard
    function initDashboard() {
      // Create message rate chart
      const messageRateCtx = document.getElementById('messageRateChart').getContext('2d');
      messageRateChart = new Chart(messageRateCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Messages Sent/sec',
              borderColor: '#0066cc',
              backgroundColor: 'rgba(0, 102, 204, 0.1)',
              data: [],
              fill: true
            },
            {
              label: 'Messages Received/sec',
              borderColor: '#cc6600',
              backgroundColor: 'rgba(204, 102, 0, 0.1)',
              data: [],
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'minute',
                displayFormats: {
                  minute: 'HH:mm'
                }
              },
              title: {
                display: true,
                text: 'Time'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Messages/sec'
              }
            }
          }
        }
      });
      
      // Create clients chart
      const clientsCtx = document.getElementById('clientsChart').getContext('2d');
      clientsChart = new Chart(clientsCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Active Clients',
            borderColor: '#00cc66',
            backgroundColor: 'rgba(0, 204, 102, 0.1)',
            data: [],
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'minute',
                displayFormats: {
                  minute: 'HH:mm'
                }
              },
              title: {
                display: true,
                text: 'Time'
              }
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Clients'
              }
            }
          }
        }
      });
      
      // Create hourly chart
      const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
      hourlyChart = new Chart(hourlyCtx, {
        type: 'bar',
        data: {
          labels: Array.from({length: 24}, (_, i) => \`\${i}:00\`),
          datasets: [{
            label: 'Connections',
            backgroundColor: 'rgba(0, 102, 204, 0.7)',
            data: Array(24).fill(0)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Connection Count'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Hour of Day'
              }
            }
          }
        }
      });
      
      // Load initial data
      refreshData();
      
      // Set up auto-refresh
      setInterval(refreshData, ${this.config.dataRefreshInterval});
      
      // Set up manual refresh
      document.getElementById('refreshBtn').addEventListener('click', refreshData);
    }
    
    // Refresh all data
    async function refreshData() {
      try {
        // Get current data
        const currentResponse = await fetch('/api/current');
        const currentData = await currentResponse.json();
        
        // Update dashboard metrics
        updateDashboardMetrics(currentData);
        
        // Get historical data
        const historyResponse = await fetch('/api/history');
        historyData = await historyResponse.json();
        
        // Update charts
        updateCharts();
        
        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    }
    
    // Update dashboard metrics
    function updateDashboardMetrics(data) {
      // Performance metrics
      document.getElementById('activeClients').textContent = 
        Math.round(data.performance.averageClients);
      document.getElementById('peakClients').textContent = 
        data.performance.peakClients;
      document.getElementById('messagesSentRate').textContent = 
        data.performance.messagesSentRate.toFixed(2);
      document.getElementById('messagesReceivedRate').textContent = 
        data.performance.messagesReceivedRate.toFixed(2);
      
      // Connection stats
      document.getElementById('totalConnections').textContent = 
        data.connections.totalConnections;
      document.getElementById('totalDisconnections').textContent = 
        data.connections.totalDisconnections;
      
      // Update hourly chart
      hourlyChart.data.datasets[0].data = data.connections.connectionsByHour;
      hourlyChart.update();
      
      // Update auth failures table
      const tableBody = document.getElementById('authFailuresTable').querySelector('tbody');
      tableBody.innerHTML = '';
      
      if (data.connections.authFailures.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="2">No authentication failures</td>';
        tableBody.appendChild(row);
      } else {
        data.connections.authFailures.forEach(([ip, count]) => {
          const row = document.createElement('tr');
          row.innerHTML = \`<td>\${ip}</td><td>\${count}</td>\`;
          tableBody.appendChild(row);
        });
      }
    }
    
    // Update charts with historical data
    function updateCharts() {
      if (historyData.length === 0) return;
      
      // Prepare data for charts
      const labels = historyData.map(entry => new Date(entry.timestamp));
      const sentRates = historyData.map(entry => entry.messagesSentRate);
      const receivedRates = historyData.map(entry => entry.messagesReceivedRate);
      const clients = historyData.map(entry => entry.clients);
      
      // Update message rate chart
      messageRateChart.data.labels = labels;
      messageRateChart.data.datasets[0].data = sentRates;
      messageRateChart.data.datasets[1].data = receivedRates;
      messageRateChart.update();
      
      // Update clients chart
      clientsChart.data.labels = labels;
      clientsChart.data.datasets[0].data = clients;
      clientsChart.update();
    }
    
    // Initialize when the page loads
    window.addEventListener('DOMContentLoaded', initDashboard);
  </script>
</body>
</html>`;
  }
}

// Create and export the visualizer
const performanceVisualizer = new PerformanceVisualizer();

module.exports = { performanceVisualizer };

// If this file is run directly, start the visualizer
if (require.main === module) {
  performanceVisualizer.start();
}
