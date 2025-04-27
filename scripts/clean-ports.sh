#!/bin/bash

# Clean Ports Utility
# This script cleans up processes using the ports needed by CompendiumnNav2

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the Node.js script
node "$DIR/clean-ports.js"
