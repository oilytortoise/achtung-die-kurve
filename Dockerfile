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

# Copy the docker entrypoint script
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# The nginx user already exists in nginx:alpine, so we don't need to create it

EXPOSE 80

CMD ["/entrypoint.sh"]
