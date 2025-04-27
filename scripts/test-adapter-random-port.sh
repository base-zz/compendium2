#!/bin/bash

# Test SignalK Adapter with Random Port
# This script uses a random port to avoid conflicts

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# First, aggressively clean up ports
echo -e "${YELLOW}Cleaning up ports before starting...${NC}"
"$(dirname "$0")/force-kill-ports.sh"

# Generate a random port between 10000-65000 to avoid conflicts with system ports
RANDOM_PORT=$((RANDOM % 55000 + 10000))
echo -e "${GREEN}Selected random port: ${RANDOM_PORT}${NC}"

# Export the port for child processes
export PORT=$RANDOM_PORT
export RELAY_PORT=$RANDOM_PORT

# Start the relay server in the background
echo -e "${BLUE}Starting relay server on port $RANDOM_PORT...${NC}"
cd "$(dirname "$0")/../src/relay" && node start-relay-server.js &
RELAY_PID=$!

# Wait for the relay server to initialize
echo -e "${YELLOW}Waiting for relay server to initialize (5 seconds)...${NC}"
sleep 5

# Check if relay server is still running
if ! ps -p $RELAY_PID > /dev/null; then
  echo -e "${RED}Relay server failed to start. Exiting.${NC}"
  exit 1
fi

# Start the test client
echo -e "${BLUE}Starting test client...${NC}"
cd "$(dirname "$0")/../src/relay" && node test-client.js

# Cleanup
echo -e "${YELLOW}Cleaning up...${NC}"
kill $RELAY_PID 2>/dev/null || true
echo -e "${GREEN}Test completed.${NC}"
