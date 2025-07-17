#!/bin/bash

# Navigate to the script directory
cd "$(dirname "$0")"

# Run the main startup script
./start-all.sh

# Keep terminal open
echo "Press any key to exit..."
read -n 1
