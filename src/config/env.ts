// Environment configuration utility
// Provides safe access to environment variables with fallbacks

// Helper function to get runtime config from window.APP_CONFIG
function getRuntimeConfig(key: string, fallback: string): string {
  console.log(`[ENV] Looking up config for key: ${key}`);
  
  // First try window.APP_CONFIG (runtime)
  if (typeof window !== 'undefined' && (window as any).APP_CONFIG) {
    console.log('[ENV] window.APP_CONFIG found:', (window as any).APP_CONFIG);
    const runtimeValue = (window as any).APP_CONFIG[key];
    console.log(`[ENV] Runtime value for ${key}:`, runtimeValue);
    if (runtimeValue && runtimeValue !== `__VITE_${key}__`) {
      console.log(`[ENV] Using runtime value: ${runtimeValue}`);
      return runtimeValue;
    }
  } else {
    console.log('[ENV] window.APP_CONFIG not found or not available');
  }
  
  // Then try Vite environment variables (build time)
  if (import.meta.env) {
    const viteKey = `VITE_${key}` as keyof ImportMetaEnv;
    const viteValue = import.meta.env[viteKey];
    console.log(`[ENV] Vite env ${viteKey}:`, viteValue);
    if (viteValue) {
      console.log(`[ENV] Using Vite env value: ${viteValue}`);
      return viteValue as string;
    }
  }
  
  // Finally use fallback
  console.log(`[ENV] Using fallback value: ${fallback}`);
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

// Log environment info ALWAYS (for debugging production issues)
console.log('🔧 Environment Configuration:', {
  WEBSOCKET_URL: ENV.WEBSOCKET_URL,
  IS_DEV: ENV.IS_DEV,
  IS_PROD: ENV.IS_PROD,
  currentLocation: typeof window !== 'undefined' ? window.location.href : 'server-side',
  hasAppConfig: typeof window !== 'undefined' && !!(window as any).APP_CONFIG,
  appConfigValue: typeof window !== 'undefined' ? (window as any).APP_CONFIG?.WEBSOCKET_URL : 'not available'
});
