// Environment configuration utility
// Provides safe access to environment variables with fallbacks

// Helper function to get runtime config from window.APP_CONFIG
function getRuntimeConfig(key: string, fallback: string): string {
  // First try window.APP_CONFIG (runtime)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
    const runtimeValue = (window as any).APP_CONFIG[key];
    if (runtimeValue && runtimeValue !== `__VITE_${key}__`) {
      return runtimeValue;
    }
  }
  
  // Then try Vite environment variables (build time)
  if (import.meta.env) {
    const viteKey = `VITE_${key}` as keyof ImportMetaEnv;
    const viteValue = import.meta.env[viteKey];
    if (viteValue) {
      return viteValue as string;
    }
  }
  
  // Finally use fallback
  return fallback;
}

export const ENV = {
  // WebSocket server URL for connecting to the game server
  WEBSOCKET_URL: getRuntimeConfig('WEBSOCKET_URL', 'http://localhost:3001'),
  
  // Development flag
  IS_DEV: import.meta.env?.VITE_DEV ?? true,
  
  // Production flag
  IS_PROD: import.meta.env?.VITE_PROD ?? false,
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
