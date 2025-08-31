#!/bin/bash

# This script injects runtime configuration into the built app
# It replaces placeholder values with actual environment variables

# Check if we're in a production environment
if [ "$NODE_ENV" = "production" ]; then
    echo "Injecting production configuration..."
    
    # Define the path to the built HTML file
    HTML_FILE="/usr/share/nginx/html/index.html"
    
    # Check if file exists
    if [ -f "$HTML_FILE" ]; then
        # Replace placeholder with actual WebSocket URL
        if [ -n "$VITE_WEBSOCKET_URL" ]; then
            echo "Setting VITE_WEBSOCKET_URL to: $VITE_WEBSOCKET_URL"
            sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" "$HTML_FILE"
        fi
        
        echo "Configuration injection complete"
    else
        echo "HTML file not found at $HTML_FILE"
    fi
else
    echo "Not in production environment, skipping config injection"
fi
