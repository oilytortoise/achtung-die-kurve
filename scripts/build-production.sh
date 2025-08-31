#!/bin/bash

# Robust production build script that avoids Vite CLI module resolution issues
# This completely bypasses the problematic vite CLI wrapper

set -e  # Exit on any error

echo "🚀 Starting robust production build..."

# Show environment info
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Working directory: $(pwd)"

# Clean environment
echo "🧹 Cleaning build environment..."
rm -rf dist/ .vite/ node_modules/.vite/ node_modules/.cache/ || true

# Fresh dependency install
echo "📦 Installing dependencies..."
npm cache clean --force || true
npm install

# Set optimal Node.js options
export NODE_OPTIONS="--max-old-space-size=8192 --no-warnings"
export NODE_ENV="production"

# Create a custom Vite build script that bypasses CLI issues
echo "🔨 Creating custom build process..."

cat > build-custom.mjs << 'EOF'
import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('⚙️ Running custom Vite build...');
  
  await build({
    root: __dirname,
    mode: 'production',
    build: {
      outDir: 'dist',
      minify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['phaser'],
            socket: ['socket.io-client']
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  });
  
  console.log('✅ Custom Vite build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Custom build failed:', error.message);
  process.exit(1);
}
EOF

# Run the custom build
echo "🚀 Running custom build process..."
node build-custom.mjs

# Clean up temporary files
rm -f build-custom.mjs

# Verify build output
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build verification failed - no index.html found"
    exit 1
fi

if [ ! -d "dist/assets" ]; then
    echo "❌ Build verification failed - no assets directory found"
    exit 1
fi

echo "✅ Build verification successful!"
echo "📁 Build contents:"
ls -la dist/

echo "🎉 Production build completed successfully!"
