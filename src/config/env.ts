// Environment configuration utility
// Provides safe access to environment variables with fallbacks

export const ENV = {
  // WebSocket server URL for connecting to the game server
  WEBSOCKET_URL: import.meta.env?.VITE_WEBSOCKET_URL || 'http://localhost:3001',
  
  // Development flag
  IS_DEV: import.meta.env?.DEV ?? true,
  
  // Production flag
  IS_PROD: import.meta.env?.PROD ?? false,
} as const;

// Helper function to get environment variable with fallback
export function getEnvVar(key: keyof typeof ENV, fallback?: string): string {
  const value = ENV[key];
  if (typeof value === 'string') {
    return value;
  }
  return fallback || '';
}

// Log environment info in development
if (ENV.IS_DEV) {
  console.log('Environment Configuration:', {
    WEBSOCKET_URL: ENV.WEBSOCKET_URL,
    IS_DEV: ENV.IS_DEV,
    IS_PROD: ENV.IS_PROD
  });
}
