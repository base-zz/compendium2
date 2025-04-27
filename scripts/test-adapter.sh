#!/bin/bash

# Simple script to test the SignalK adapter system

# Kill any existing processes
echo "Killing any existing processes..."
pkill -f "node.*relay" || true
sleep 1

# Set a unique port
PORT=3456

# Export the port for child processes
export PORT
export RELAY_PORT=$PORT

# Start the relay server in the background
echo "Starting relay server on port $PORT..."
cd "$(dirname "$0")/../src/relay" && node start-relay-server.js &
RELAY_PID=$!

# Wait for the relay server to initialize
echo "Waiting for relay server to initialize (3 seconds)..."
sleep 3

# Start the test client
echo "Starting test client..."
cd "$(dirname "$0")/../src/relay" && node test-client.js

# Cleanup
kill $RELAY_PID 2>/dev/null || true
echo "Test completed."
