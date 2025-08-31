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

# Debug: List what's in docker-entrypoint.d and create our script
RUN ls -la /docker-entrypoint.d/ && \
    cat > /docker-entrypoint.d/40-inject-config.sh << 'EOF'
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
EOF

# Make it executable and verify it was created
RUN chmod +x /docker-entrypoint.d/40-inject-config.sh && \
    ls -la /docker-entrypoint.d/40-inject-config.sh && \
    echo "Script content:" && cat /docker-entrypoint.d/40-inject-config.sh

# The nginx user already exists in nginx:alpine, so we don't need to create it

EXPOSE 80

# Use nginx's default CMD which will run our script in /docker-entrypoint.d/
CMD ["nginx", "-g", "daemon off;"]
