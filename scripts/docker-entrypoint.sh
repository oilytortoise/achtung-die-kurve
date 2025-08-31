#!/bin/bash
set -e

echo "Starting container initialization..."

# Inject runtime configuration
if [ -n "$VITE_WEBSOCKET_URL" ]; then
  echo "Injecting WEBSOCKET_URL: $VITE_WEBSOCKET_URL"
  sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" /usr/share/nginx/html/config.js
  echo "Configuration injection complete"
else
  echo "Warning: VITE_WEBSOCKET_URL not set, using default localhost"
fi

# Verify the config file was updated
echo "Current config.js content:"
cat /usr/share/nginx/html/config.js

echo "Starting nginx..."
# Start nginx
exec nginx -g "daemon off;"
