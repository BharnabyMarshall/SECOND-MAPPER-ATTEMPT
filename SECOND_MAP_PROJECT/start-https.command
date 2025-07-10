#!/bin/zsh
# Start a local HTTPS server for MapLibre vector tiles and open the browser (using http-server)
cd "$(dirname "$0")"

# Generate a self-signed certificate if not present
if [ ! -f server.key ] || [ ! -f server.cert ]; then
  echo "Generating self-signed certificate (server.key/server.cert)..."
  openssl req -new -x509 -keyout server.key -out server.cert -days 365 -nodes -subj "/CN=localhost"
fi

# Start HTTPS server on port 8443 using http-server
http-server -S -C server.cert -K server.key -p 8443 &
PID=$!
sleep 1
open "https://localhost:8443/index.html"
wait $PID
