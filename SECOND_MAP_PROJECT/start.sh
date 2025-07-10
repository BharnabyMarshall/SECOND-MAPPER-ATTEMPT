#!/bin/zsh
# Start a simple HTTP server and open the browser to the map UI
cd "$(dirname "$0")"
python3 -m http.server 8080 &
PID=$!
sleep 1
open "http://localhost:8080/index.html"
wait $PID
