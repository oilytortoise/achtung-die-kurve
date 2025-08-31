# Multi-stage build for the client
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Set Node.js environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package files for the client
COPY package*.json ./

# Clean install with all dependencies (including dev for build)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Remove server directory to avoid conflicts
RUN rm -rf server/

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
