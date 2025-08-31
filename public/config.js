// Runtime configuration for production deployment
// This file uses a custom entrypoint script for environment variable substitution
// Version: 2024-08-31-v2

window.APP_CONFIG = {
  WEBSOCKET_URL: '__VITE_WEBSOCKET_URL__', // This will be replaced by entrypoint script
  VERSION: '2024-08-31-v2'
};

console.log('🔧 Config.js loaded:', window.APP_CONFIG);
