# Multi-stage build for the client
FROM node:lts-alpine AS build

# Set working directory
WORKDIR /app

# Set Node.js environment for build
ENV NODE_ENV=development
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Accept build arguments for environment variables
ARG VITE_WEBSOCKET_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL

# Copy package files and install ALL dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy ALL source files to avoid missing dependencies
COPY . .

# Clean up server directory to avoid conflicts
RUN rm -rf server/ || true

# Build the application using the standard build process
RUN npm run build

# Verify build output exists
RUN ls -la dist/ && test -f dist/index.html
RUN test -f dist/index.html || (echo "Build failed" && exit 1)

# Production stage - serve static files
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create entrypoint script inline with enhanced debugging and error handling
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'set -e' >> /entrypoint.sh && \
    echo 'echo "[Entrypoint] Starting configuration injection..."' >> /entrypoint.sh && \
    echo 'echo "[Entrypoint] Environment variables:"' >> /entrypoint.sh && \
    echo 'env | grep -E "(VITE_|PORT|NODE_ENV)" || echo "No VITE_ variables found"' >> /entrypoint.sh && \
    echo 'CONFIG_FILE="/usr/share/nginx/html/config.js"' >> /entrypoint.sh && \
    echo 'echo "[Entrypoint] Config file exists: $(test -f "$CONFIG_FILE" && echo "YES" || echo "NO")"' >> /entrypoint.sh && \
    echo 'if [ -f "$CONFIG_FILE" ]; then' >> /entrypoint.sh && \
    echo '  echo "[Entrypoint] Original config.js content:"' >> /entrypoint.sh && \
    echo '  cat "$CONFIG_FILE"' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'if [ -n "$VITE_WEBSOCKET_URL" ]; then' >> /entrypoint.sh && \
    echo '  echo "[Entrypoint] Injecting WEBSOCKET_URL: $VITE_WEBSOCKET_URL"' >> /entrypoint.sh && \
    echo '  sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" "$CONFIG_FILE"' >> /entrypoint.sh && \
    echo '  echo "[Entrypoint] Substitution completed"' >> /entrypoint.sh && \
    echo 'else' >> /entrypoint.sh && \
    echo '  echo "[Entrypoint] ERROR: VITE_WEBSOCKET_URL not set!"' >> /entrypoint.sh && \
    echo '  echo "[Entrypoint] Available env vars:"' >> /entrypoint.sh && \
    echo '  env' >> /entrypoint.sh && \
    echo '  echo "[Entrypoint] Using fallback: wss://achtung.jackstevens.tech"' >> /entrypoint.sh && \
    echo '  sed -i "s|__VITE_WEBSOCKET_URL__|wss://achtung.jackstevens.tech|g" "$CONFIG_FILE"' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'echo "[Entrypoint] Final config.js content:"' >> /entrypoint.sh && \
    echo 'cat "$CONFIG_FILE"' >> /entrypoint.sh && \
    echo 'echo "[Entrypoint] Starting nginx..."' >> /entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

EXPOSE 80

# Use the inline entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
