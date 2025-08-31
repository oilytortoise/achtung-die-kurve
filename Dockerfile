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

# Create the config injection script using printf to avoid heredoc issues
RUN printf '#!/bin/bash\nset -e\n\necho "[Config Injection] Starting configuration injection..."\n\n# Inject runtime configuration\nif [ -n "$VITE_WEBSOCKET_URL" ]; then\n  echo "[Config Injection] Injecting WEBSOCKET_URL: $VITE_WEBSOCKET_URL"\n  sed -i "s|__VITE_WEBSOCKET_URL__|$VITE_WEBSOCKET_URL|g" /usr/share/nginx/html/config.js\n  echo "[Config Injection] Configuration injection complete"\nelse\n  echo "[Config Injection] Warning: VITE_WEBSOCKET_URL not set, using default localhost"\nfi\n\n# Verify the config file was updated\necho "[Config Injection] Current config.js content:"\ncat /usr/share/nginx/html/config.js\n\necho "[Config Injection] Configuration injection finished"\n' > /docker-entrypoint.d/40-inject-config.sh

# Make it executable and verify it was created
RUN chmod +x /docker-entrypoint.d/40-inject-config.sh && \
    ls -la /docker-entrypoint.d/40-inject-config.sh && \
    echo "Script exists and is executable"

# The nginx user already exists in nginx:alpine, so we don't need to create it

EXPOSE 80

# Use nginx's default CMD which will run our script in /docker-entrypoint.d/
CMD ["nginx", "-g", "daemon off;"]
