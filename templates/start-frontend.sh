#!/bin/bash
# Universal Frontend Starter for LumioVibe
# Usage: bash /openhands/templates/start-frontend.sh [PROJECT_DIR] [--test]
#
# This script:
# 1. Kills ALL previous frontend processes
# 2. Starts the new frontend in background
# 3. Opens browser to the app
#
# Can be called multiple times - will restart the frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${WORKSPACE:-/workspace}"

# Parse arguments
PROJECT_DIR=""
TEST_MODE=""

for arg in "$@"; do
    case $arg in
        --test|-t)
            TEST_MODE="--test"
            ;;
        *)
            if [ -z "$PROJECT_DIR" ] && [ -d "$arg" ]; then
                PROJECT_DIR="$arg"
            elif [ -z "$PROJECT_DIR" ] && [ -d "$WORKSPACE/$arg" ]; then
                PROJECT_DIR="$WORKSPACE/$arg"
            fi
            ;;
    esac
done

# Try to find project directory
if [ -z "$PROJECT_DIR" ]; then
    # Try current directory
    if [ -f "frontend/package.json" ]; then
        PROJECT_DIR="$(pwd)"
    elif [ -f "package.json" ] && [ -f "src/App.tsx" ]; then
        PROJECT_DIR="$(dirname "$(pwd)")"
    else
        # Find most recent project in workspace
        LATEST_PROJECT=$(find "$WORKSPACE" -maxdepth 2 -name "package.json" -path "*/frontend/*" -type f 2>/dev/null | head -1)
        if [ -n "$LATEST_PROJECT" ]; then
            PROJECT_DIR="$(dirname "$(dirname "$LATEST_PROJECT")")"
        fi
    fi
fi

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR/frontend" ]; then
    echo "❌ ERROR: Could not find project directory"
    echo ""
    echo "Usage: bash start-frontend.sh PROJECT_DIR [--test]"
    echo "Example: bash start-frontend.sh /workspace/my_project --test"
    exit 1
fi

FRONTEND_DIR="$PROJECT_DIR/frontend"
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "================================================"
echo "  Starting Frontend: $PROJECT_NAME"
echo "================================================"

# Check required environment variables
if [ -z "$APP_PORT_1" ]; then
    echo "❌ ERROR: APP_PORT_1 not set"
    echo "This script must run inside LumioVibe runtime"
    exit 1
fi

if [ -z "$APP_BASE_URL_1" ]; then
    echo "❌ ERROR: APP_BASE_URL_1 not set"
    exit 1
fi

PORT="$APP_PORT_1"
BASE_URL="$APP_BASE_URL_1"

echo "Port: $PORT"
echo "URL: $BASE_URL"
echo ""

# Kill ALL previous frontend processes
echo "🔄 Stopping all previous frontends..."

# Kill any vite/node processes on our port range
for p in $(seq 50000 54999); do
    lsof -ti:$p 2>/dev/null | xargs kill -9 2>/dev/null || true
done

# Also kill by process name pattern
pkill -9 -f "vite.*--port" 2>/dev/null || true
pkill -9 -f "node.*vite" 2>/dev/null || true

sleep 1

# Verify port is free
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "⚠️  Port $PORT still busy, force killing..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start frontend
echo "🚀 Starting frontend..."
cd "$FRONTEND_DIR"

# Ensure dependencies installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install --silent 2>&1 || pnpm install
fi

# Build environment and base path
VITE_ENV="VITE_BASE_URL=$BASE_URL"
VITE_BASE="/"

if [ -n "$TEST_MODE" ]; then
    VITE_ENV="$VITE_ENV VITE_WALLET_MODE=test"
    VITE_BASE="/"
    echo "🧪 Mode: TEST (base=/, for browser() inside container)"
else
    # Production: extract path from URL for nginx reverse proxy
    # e.g., https://host/runtime/50198 → /runtime/50198/
    VITE_BASE=$(echo "$BASE_URL" | sed -E 's|^https?://[^/]+||')
    if [ -z "$VITE_BASE" ]; then
        VITE_BASE="/"
    elif [[ ! "$VITE_BASE" =~ /$ ]]; then
        VITE_BASE="$VITE_BASE/"
    fi
    echo "🔐 Mode: PRODUCTION (base=$VITE_BASE, for nginx proxy)"
fi

# Start in background
nohup env $VITE_ENV pnpm vite --host --port $PORT --strictPort --base "$VITE_BASE" > /tmp/frontend-$PROJECT_NAME.log 2>&1 &
FRONTEND_PID=$!

echo "📝 PID: $FRONTEND_PID"
echo "📝 Log: /tmp/frontend-$PROJECT_NAME.log"

# Wait for server to be ready
echo "⏳ Waiting for server..."
for i in {1..30}; do
    if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
        echo ""
        echo "================================================"
        echo "  ✅ Frontend is running!"
        echo "================================================"
        echo ""
        echo "📍 Local: http://localhost:$PORT"
        echo "🌐 External: $BASE_URL"
        echo ""

        # Save info for other scripts
        echo "$PROJECT_DIR" > /tmp/lumiovibe-current-project
        echo "$FRONTEND_PID" > /tmp/lumiovibe-frontend-pid

        exit 0
    fi
    sleep 1
    echo -n "."
done

echo ""
echo "❌ ERROR: Server didn't start in 30 seconds"
echo "Check logs: tail -50 /tmp/frontend-$PROJECT_NAME.log"
cat /tmp/frontend-$PROJECT_NAME.log | tail -20
exit 1
