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

# Create the config injection script directly in the container
RUN echo '#!/bin/bash' > /docker-entrypoint.d/40-inject-config.sh && \
    echo 'set -e' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'echo "[Config Injection] Starting configuration injection..."' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '# Inject runtime configuration' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'if [ -n "$VITE_WEBSOCKET_URL" ]; then' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  echo "[Config Injection] Injecting WEBSOCKET_URL: $VITE_WEBSOCKET_URL"' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  echo "[Config Injection] Configuration injection complete"' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'else' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '  echo "[Config Injection] Warning: VITE_WEBSOCKET_URL not set, using default localhost"' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'fi' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '# Verify the config file was updated' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'echo "[Config Injection] Current config.js content:"' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'cat /usr/share/nginx/html/config.js' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo '' >> /docker-entrypoint.d/40-inject-config.sh && \
    echo 'echo "[Config Injection] Configuration injection finished"' >> /docker-entrypoint.d/40-inject-config.sh && \
    chmod +x /docker-entrypoint.d/40-inject-config.sh

# The nginx user already exists in nginx:alpine, so we don't need to create it

EXPOSE 80

# Use nginx's default CMD which will run our script in /docker-entrypoint.d/
CMD ["nginx", "-g", "daemon off;"]
