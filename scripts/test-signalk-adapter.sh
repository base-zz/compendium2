#!/bin/bash

# Test SignalK Adapter System
# This script tests the SignalK adapter system with a less common port

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Determine script and project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RELAY_DIR="$PROJECT_DIR/src/relay"

# Use a less common port
PORT=8765

# Print header
echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}   SignalK Adapter System Test${NC}"
echo -e "${GREEN}=========================================${NC}\n"

# Kill any existing processes on our ports
echo -e "${YELLOW}Killing any existing processes...${NC}"
pkill -f "node.*relay" 2>/dev/null || true
lsof -i :$PORT -t 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

# Export the port for child processes
export PORT=$PORT
export RELAY_PORT=$PORT

echo -e "${GREEN}Using port: $PORT${NC}"

# Start the relay server in the background
echo -e "${BLUE}Starting relay server...${NC}"
cd "$RELAY_DIR" || { echo -e "${RED}Error: Could not find relay directory at $RELAY_DIR${NC}"; exit 1; }

# Start the relay server with the correct environment variables
node start-relay-server.js &
RELAY_PID=$!

# Wait for the relay server to initialize
echo -e "${YELLOW}Waiting for relay server to initialize (5 seconds)...${NC}"
sleep 5

# Check if relay server is still running
if ! ps -p $RELAY_PID > /dev/null; then
  echo -e "${YELLOW}Relay server process ended. Checking if another instance is running...${NC}"
  RUNNING_PID=$(lsof -i :$PORT -t 2>/dev/null)
  if [ -n "$RUNNING_PID" ]; then
    echo -e "${GREEN}Found relay server running with PID: $RUNNING_PID${NC}"
    RELAY_PID=$RUNNING_PID
  else
    echo -e "${RED}No relay server found running on port $PORT. Exiting.${NC}"
    exit 1
  fi
fi

# Start the test client
echo -e "\n${BLUE}Starting test client...${NC}"
echo -e "${YELLOW}Connecting to relay server on port $PORT...${NC}"

# Run the test client with the correct environment variable
cd "$RELAY_DIR" || { echo -e "${RED}Error: Could not find relay directory${NC}"; exit 1; }
node test-client.js

# Cleanup
echo -e "\n${YELLOW}Cleaning up...${NC}"
kill $RELAY_PID 2>/dev/null || true
echo -e "${GREEN}Test completed.${NC}"
