# Multi-stage build for the client
FROM node:24.2.0-alpine AS build

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set Node.js environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=8192"

# Copy package files for the client
COPY package*.json ./

# Clean install with fresh dependencies
RUN npm install --verbose

# Copy source code
COPY . .

# Remove server directory to avoid conflicts
RUN rm -rf server/

# Show versions for debugging
RUN node --version && npm --version

# Build the application
RUN npm run build

# Production stage - serve static files
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nginx -u 1001

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
