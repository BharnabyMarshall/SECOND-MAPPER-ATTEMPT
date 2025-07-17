#!/bin/bash

echo "🚀 Starting Tile Cache Server and HTTP Server..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    pkill -f "tile-cache-server.js"
    pkill -f "python3 -m http.server 8000"
    exit 0
}

# Set up trap for cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

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
open "http://localhost:8000" 2>/dev/null || echo "Please open http://localhost:8000 in your browser manually"

echo ""
echo "✅ All services started!"
echo "📦 Tile Cache Server: http://localhost:8001"
echo "🌐 HTTP Server: http://localhost:8000"
echo ""
echo "💡 Press Ctrl+C to stop all services"
echo ""

# Keep the script running
while true; do
    sleep 1
done
