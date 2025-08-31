#!/bin/bash
set -e

echo "[Config Injection] Starting configuration injection..."

# Inject runtime configuration
if [ -n "$VITE_WEBSOCKET_URL" ]; then
  echo "[Config Injection] Injecting WEBSOCKET_URL: $VITE_WEBSOCKET_URL"
  sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" /usr/share/nginx/html/config.js
  echo "[Config Injection] Configuration injection complete"
else
  echo "[Config Injection] Warning: VITE_WEBSOCKET_URL not set, using default localhost"
fi

# Verify the config file was updated
echo "[Config Injection] Current config.js content:"
cat /usr/share/nginx/html/config.js

echo "[Config Injection] Configuration injection finished"
