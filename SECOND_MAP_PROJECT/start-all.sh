#!/bin/bash

# Start All Services - Tile Cache Server + HTTP Server + Browser
# This script starts both servers and opens the browser automatically

echo "🚀 Starting Tile Cache Server and HTTP Server..."

# Get the current directory (where this script is located)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
echo "📍 Working directory: $DIR"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $CACHE_PID 2>/dev/null
    kill $HTTP_PID 2>/dev/null
    exit 0
}

# Set up trap for cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Change to the project directory
cd "$DIR"
echo "📂 Changed to: $(pwd)"

# Check if required files exist
if [ ! -f "tile-cache-server.js" ]; then
    echo "❌ Error: tile-cache-server.js not found in $(pwd)"
    exit 1
fi

# Start the tile cache server in background
echo "📦 Starting tile cache server on port 8001..."
node tile-cache-server.js &
CACHE_PID=$!

# Wait a moment for the cache server to start
sleep 2

# Start the HTTP server in background
echo "🌐 Starting HTTP server on port 8000..."
python3 -m http.server 8000 &
HTTP_PID=$!

# Wait a moment for the HTTP server to start
sleep 2

# Open the browser
echo "🌐 Opening browser..."
if command -v open &> /dev/null; then
    # macOS
    open "http://localhost:8000"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "http://localhost:8000"
elif command -v start &> /dev/null; then
    # Windows
    start "http://localhost:8000"
else
    echo "Please open http://localhost:8000 in your browser manually"
fi

echo ""
echo "✅ All services started!"
echo "📦 Tile Cache Server: http://localhost:8001"
echo "🌐 HTTP Server: http://localhost:8000"
echo ""
echo "💡 The browser should open automatically to http://localhost:8000"
echo "💡 Press Ctrl+C to stop all services"
echo ""

# Keep the script running and display server status
while true; do
    # Check if servers are still running
    if ! kill -0 $CACHE_PID 2>/dev/null; then
        echo "❌ Tile cache server stopped unexpectedly"
        break
    fi
    if ! kill -0 $HTTP_PID 2>/dev/null; then
        echo "❌ HTTP server stopped unexpectedly"
        break
    fi
    
    sleep 5
done
