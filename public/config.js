// Runtime configuration for production deployment
// This file uses nginx envsubst for environment variable substitution

window.APP_CONFIG = {
  WEBSOCKET_URL: '${VITE_WEBSOCKET_URL}' // This will be replaced by nginx envsubst
};
