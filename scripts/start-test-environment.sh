#!/bin/bash

# Start Test Environment Script
# This script starts the relay server and test client for CompendiumnNav2

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$DIR/.." && pwd )"

# Clean ports first
echo "Cleaning ports before starting services..."
"$DIR/clean-ports.sh"

# Start the relay server in the background
echo "Starting relay server..."
cd "$PROJECT_ROOT/src/relay" && node start-relay-server.js &
RELAY_PID=$!

# Wait for the relay server to initialize
echo "Waiting for relay server to initialize (5 seconds)..."
sleep 5

# Start the test client
echo "Starting test client..."
cd "$PROJECT_ROOT/src/relay" && node test-client.js

# When the test client exits, kill the relay server
echo "Test client exited, cleaning up..."
kill $RELAY_PID 2>/dev/null

echo "Test environment shutdown complete."
