// Runtime configuration for production deployment
// This file uses a custom entrypoint script for environment variable substitution

window.APP_CONFIG = {
  WEBSOCKET_URL: '__VITE_WEBSOCKET_URL__' // This will be replaced by entrypoint script
};
