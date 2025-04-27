#!/bin/bash

# Force Kill Ports Script
# This script aggressively kills any processes using specific ports

# Define colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Ports to check
PORTS=(3001 3002 3456 9753)

echo -e "${YELLOW}===== Aggressive Port Cleanup =====${NC}"

# Function to kill processes on a port
kill_port() {
  local port=$1
  echo -e "${YELLOW}Checking port ${port}...${NC}"
  
  # Find PIDs using lsof
  pids=$(lsof -i :$port -t 2>/dev/null)
  
  if [ -z "$pids" ]; then
    echo -e "${GREEN}✓ No processes found using port $port${NC}"
  else
    echo -e "${RED}! Found processes using port $port: $pids${NC}"
    
    # Kill each process
    for pid in $pids; do
      echo -e "${RED}Killing process $pid...${NC}"
      kill -9 $pid 2>/dev/null
    done
    
    # Verify
    sleep 1
    pids=$(lsof -i :$port -t 2>/dev/null)
    if [ -z "$pids" ]; then
      echo -e "${GREEN}✓ Port $port is now free${NC}"
    else
      echo -e "${RED}! Failed to free port $port, processes still running: $pids${NC}"
    fi
  fi
}

# Kill any node processes that might be related to our app
echo -e "${YELLOW}Killing any node processes related to relay...${NC}"
pkill -f "node.*relay" 2>/dev/null || true
sleep 1

# Check and kill processes on each port
for port in "${PORTS[@]}"; do
  kill_port $port
done

echo -e "${GREEN}===== Port cleanup completed =====${NC}"
