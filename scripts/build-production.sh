#!/bin/bash

# Production build script for Digital Ocean
# This script handles common Node.js module resolution issues

set -e  # Exit on any error

echo "🚀 Starting production build process..."

# Show environment info
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"

# Clean up any previous build artifacts
echo "🧹 Cleaning up previous builds..."
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/

# Install dependencies with fresh cache
echo "📦 Installing dependencies..."
npm cache clean --force 2>/dev/null || true
npm install --no-fund --no-audit --verbose

# Verify critical modules
echo "🔍 Verifying critical modules..."
if [ ! -f "node_modules/vite/package.json" ]; then
    echo "❌ Vite not found, reinstalling..."
    npm install vite@5.4.2 --save-dev
fi

if [ ! -f "node_modules/typescript/package.json" ]; then
    echo "❌ TypeScript not found, reinstalling..."
    npm install typescript@5.5.4 --save-dev
fi

# Run type checking
echo "📝 Running type check..."
npm run type-check

# Build with explicit Node.js options
echo "🔨 Building application..."
export NODE_OPTIONS="--max-old-space-size=8192"
export NODE_ENV="production"

# Try multiple build approaches to handle different environments
echo "Attempting build method 1: Direct vite binary..."
if ./node_modules/.bin/vite build --mode production; then
    echo "✅ Build method 1 successful"
elif [ -x "$(command -v npx)" ]; then
    echo "⚠️ Build method 1 failed, trying method 2: npx..."
    if npx vite build --mode production; then
        echo "✅ Build method 2 successful"
    else
        echo "⚠️ Build method 2 failed, trying method 3: npm script..."
        npm run build:safe
    fi
else
    echo "⚠️ Build method 1 failed, trying method 3: npm script..."
    npm run build:safe
fi

echo "✅ Build completed successfully!"
echo "📁 Build output in dist/ directory"

# Verify build output
if [ ! -f "dist/index.html" ]; then
    echo "❌ Build failed - no index.html found"
    exit 1
fi

echo "🎉 Production build ready for deployment!"
