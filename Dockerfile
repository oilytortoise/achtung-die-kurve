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

# Create a template config file that nginx can substitute
RUN mv /usr/share/nginx/html/config.js /usr/share/nginx/html/config.js.template

# Set up environment variable for nginx envsubst
ENV NGINX_ENVSUBST_OUTPUT_DIR=/usr/share/nginx/html
ENV NGINX_ENVSUBST_TEMPLATE_DIR=/usr/share/nginx/html
ENV NGINX_ENVSUBST_TEMPLATE_SUFFIX=.template
ENV NGINX_ENVSUBST_FILTER_FILES=config.js
# Tell nginx which variables to substitute
ENV DOLLAR='$'
# Add debug output
RUN echo "VITE_WEBSOCKET_URL will be substituted in templates"

# The nginx user already exists in nginx:alpine, so we don't need to create it

EXPOSE 80

# Use nginx's default CMD which will run our script in /docker-entrypoint.d/
CMD ["nginx", "-g", "daemon off;"]
