#!/bin/bash

echo "🚀 Starting Enhanced Map Server with Tile Caching"
echo "================================================="

# Start tile cache server
echo "📦 Starting tile cache server on port 8001..."
node tile-cache-server.js &
CACHE_PID=$!

# Wait a moment for cache server to start
sleep 2

# Start main web server
echo "🌐 Starting main web server on port 8000..."
python3 -m http.server 8000 &
WEB_PID=$!

echo ""
echo "✅ Both servers started successfully!"
echo ""
echo "🌍 Main app: http://localhost:8000"
echo "📦 Tile cache: http://localhost:8001" 
echo "🎯 Use 'Cached Sat' for lightning-fast satellite tiles!"
echo ""
echo "💡 Pro tip: Run 'node preload-cache.js' to pre-download"
echo "   common tiles for instant broadcast performance."
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $CACHE_PID 2>/dev/null
    kill $WEB_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Wait for both processes
wait
