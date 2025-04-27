#!/bin/bash
# Setup script for VPS Relay Proxy
# This script helps set up the VPS Relay Proxy on a cloud server

# Make script executable
chmod +x manageTokens.js

# Create data directory if it doesn't exist
mkdir -p data

# Install dependencies
echo "Installing dependencies..."
npm install

# Check if .env file exists, create it if not
if [ ! -f .env ]; then
  echo "Creating default .env file..."
  cat > .env << EOF
# VPS Relay Proxy Configuration
VPS_PROXY_PORT=8080
VPS_PROXY_PATH=/relay
RELAY_SERVER_URL=ws://your-relay-server:3001
REQUIRE_AUTH=true
TOKEN_SECRET=$(openssl rand -hex 32)
TOKEN_EXPIRY=86400
TOKEN_FILE=./data/tokens.json
LOG_LEVEL=info

# Reconnection settings
RECONNECT_DELAY=3000
MAX_RECONNECT_ATTEMPTS=10

# For development only, set to false in production
GENERATE_TEST_TOKEN=false
EOF
  echo "Created .env file with a random TOKEN_SECRET"
  echo "Please update RELAY_SERVER_URL in the .env file to point to your actual relay server"
else
  echo ".env file already exists, skipping creation"
fi

# Generate a test token if requested
read -p "Do you want to generate a test token? (y/n): " generate_token
if [[ $generate_token == "y" || $generate_token == "Y" ]]; then
  read -p "Enter user ID: " user_id
  read -p "Enter vessel ID: " vessel_id
  read -p "Enter user name (optional): " user_name
  
  if [ -z "$user_name" ]; then
    node manageTokens.js generate "$user_id" "$vessel_id"
  else
    node manageTokens.js generate "$user_id" "$vessel_id" "$user_name"
  fi
fi

echo ""
echo "Setup complete! You can now start the VPS Relay Proxy with:"
echo "npm start"
echo ""
echo "For token management, use:"
echo "npm run tokens -- [command] [arguments]"
echo "For example: npm run tokens -- list"
