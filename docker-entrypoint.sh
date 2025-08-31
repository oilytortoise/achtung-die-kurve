#!/bin/bash
set -e

echo "[Docker Entrypoint] Starting configuration injection..."

# Define the config file path
CONFIG_FILE="/usr/share/nginx/html/config.js"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[Docker Entrypoint] Error: Config file not found at $CONFIG_FILE"
    exit 1
fi

# Show the config file before substitution
echo "[Docker Entrypoint] Config file before substitution:"
cat "$CONFIG_FILE"

# Inject runtime configuration
if [ -n "$VITE_WEBSOCKET_URL" ]; then
    echo "[Docker Entrypoint] Injecting WEBSOCKET_URL: $VITE_WEBSOCKET_URL"
    sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" "$CONFIG_FILE"
    echo "[Docker Entrypoint] Configuration injection complete"
else
    echo "[Docker Entrypoint] Warning: VITE_WEBSOCKET_URL not set"
    # Set a default for development
    DEFAULT_URL="http://localhost:3001"
    echo "[Docker Entrypoint] Using default WebSocket URL: $DEFAULT_URL"
    sed -i "s|__VITE_WEBSOCKET_URL__|$DEFAULT_URL|g" "$CONFIG_FILE"
fi

# Show the config file after substitution
echo "[Docker Entrypoint] Config file after substitution:"
cat "$CONFIG_FILE"

echo "[Docker Entrypoint] Configuration injection finished"

# Start nginx
echo "[Docker Entrypoint] Starting nginx..."
exec nginx -g "daemon off;"
