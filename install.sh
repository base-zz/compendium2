#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_URL="https://raw.githubusercontent.com/base-zz/compendium2/main/compendium-deploy.sh"
SCRIPT_NAME="compendium-install-$(date +%s).sh"
TEMP_SCRIPT="$(mktemp /tmp/${SCRIPT_NAME})"

# Cleanup function
cleanup() {
    if [ -f "$TEMP_SCRIPT" ]; then
        rm -f "$TEMP_SCRIPT" 2>/dev/null || true
    fi
}

# Set up trap to ensure cleanup happens
trap cleanup EXIT

# Check for required commands
for cmd in curl sudo; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${RED}Error: Required command '$cmd' not found${NC}" >&2
        exit 1
    fi
done

echo -e "${GREEN}=== Compendium Navigation Server Installer ===${NC}"

# Download the installation script
echo -e "${YELLOW}Downloading installation script...${NC}"
if ! curl -sSL "$SCRIPT_URL" -o "$TEMP_SCRIPT"; then
    echo -e "${RED}Error: Failed to download installation script${NC}" >&2
    exit 1
fi

# Make script executable
if ! chmod +x "$TEMP_SCRIPT"; then
    echo -e "${RED}Error: Failed to make script executable${NC}" >&2
    exit 1
fi

# Execute the installation script with all passed arguments
echo -e "${YELLOW}Starting installation...${NC}"
echo -e "${YELLOW}You may be prompted for your password to continue with sudo.${NC}"
echo ""

# Pass all arguments to the installation script
if ! sudo "$TEMP_SCRIPT" "$@"; then
    echo -e "\n${RED}Installation failed.${NC}" >&2
    exit 1
fi

echo -e "\n${GREEN}Installation completed successfully!${NC}"
exit 0