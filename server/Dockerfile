FROM node:24.2.0-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server code
COPY server/server.js ./

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3001, timeout: 2000 }; \
    const request = http.request(options, (res) => { \
      process.exit(res.statusCode === 404 ? 0 : 1); \
    }); \
    request.on('error', () => process.exit(1)); \
    request.end();"

# Start server
CMD ["node", "server.js"]
