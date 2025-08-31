#!/bin/bash

# Development script to run both client and server concurrently

echo "🚀 Starting Achtung die Kurve development environment..."

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Shutting down development environment..."
    pkill -f "node server/server.js"
    pkill -f "vite"
    exit 0
}

# Trap signals to cleanup on exit
trap cleanup SIGINT SIGTERM

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📦 Installing client dependencies..."
cd "$PROJECT_ROOT" && npm install

echo "📦 Installing server dependencies..."
cd "$PROJECT_ROOT/server" && npm install

echo "🌐 Starting server on port 3001..."
cd "$PROJECT_ROOT/server" && node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

echo "🎮 Starting client development server on port 3000..."
cd "$PROJECT_ROOT" && npm run dev &
CLIENT_PID=$!

echo "✅ Development environment ready!"
echo "🎮 Client: http://localhost:3000"
echo "🌐 Server: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for any process to exit
wait
