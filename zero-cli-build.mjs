#!/usr/bin/env node

// Zero-CLI Vite build - completely bypasses all CLI infrastructure
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Initializing zero-CLI build process...');

try {
  // Dynamic import to avoid any CLI dependencies
  const { build } = await import('vite');
  
  console.log('⚙️ Running programmatic Vite build...');
  
  const buildResult = await build({
    root: __dirname,
    mode: 'production',
    logLevel: 'info',
    clearScreen: false,
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: 'terser',
      sourcemap: false,
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['phaser'],
            socket: ['socket.io-client']
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
  
  console.log('✅ Zero-CLI build completed successfully!');
  console.log('📋 Build result:', buildResult ? 'Success' : 'Unknown');
  
  // Verify critical files exist
  const distPath = resolve(__dirname, 'dist');
  const indexPath = join(distPath, 'index.html');
  const assetsPath = join(distPath, 'assets');
  
  if (!existsSync(indexPath)) {
    throw new Error('index.html not found in dist/');
  }
  
  if (!existsSync(assetsPath)) {
    throw new Error('assets/ directory not found in dist/');
  }
  
  console.log('🎯 Build verification passed!');
  process.exit(0);
  
} catch (error) {
  console.error('❌ Zero-CLI build failed:');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
