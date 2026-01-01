#!/bin/bash
# Counter Template Start Script
# Usage: bash start.sh [PROJECT_DIR] [--test]
#
# This script:
# 1. Kills any previous frontend processes
# 2. Installs dependencies if needed
# 3. Starts frontend in foreground or background
# 4. Writes logs to file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${WORKSPACE:-/workspace}"

# Parse arguments
PROJECT_DIR=""
TEST_MODE=""
BACKGROUND=""

for arg in "$@"; do
    case $arg in
        --test|-t)
            TEST_MODE="test"
            ;;
        --background|-b)
            BACKGROUND="true"
            ;;
        *)
            if [ -z "$PROJECT_DIR" ]; then
                if [ -d "$arg" ]; then
                    PROJECT_DIR="$arg"
                elif [ -d "$WORKSPACE/$arg" ]; then
                    PROJECT_DIR="$WORKSPACE/$arg"
                fi
            fi
            ;;
    esac
done

# Find project directory
if [ -z "$PROJECT_DIR" ]; then
    if [ -f /tmp/lumiovibe-current-project ]; then
        PROJECT_DIR=$(cat /tmp/lumiovibe-current-project)
    elif [ -f "$WORKSPACE/frontend/package.json" ]; then
        PROJECT_DIR="$WORKSPACE"
    else
        LATEST=$(find "$WORKSPACE" -maxdepth 2 -name "package.json" -path "*/frontend/*" 2>/dev/null | head -1)
        if [ -n "$LATEST" ]; then
            PROJECT_DIR="$(dirname "$(dirname "$LATEST")")"
        fi
    fi
fi

if [ -z "$PROJECT_DIR" ] || [ ! -d "$PROJECT_DIR/frontend" ]; then
    echo "ERROR: Could not find project directory"
    echo "Usage: bash start.sh PROJECT_DIR [--test] [--background]"
    exit 1
fi

FRONTEND_DIR="$PROJECT_DIR/frontend"
PROJECT_NAME=$(basename "$PROJECT_DIR")
LOG_FILE="/tmp/frontend-$PROJECT_NAME.log"

echo "================================================"
echo "  Starting Frontend: $PROJECT_NAME"
echo "================================================"

# Check required environment
if [ -z "$APP_PORT_1" ]; then
    echo "ERROR: APP_PORT_1 not set"
    echo "This script must run inside LumioVibe runtime"
    exit 1
fi

if [ -z "$APP_BASE_URL_1" ]; then
    echo "ERROR: APP_BASE_URL_1 not set"
    exit 1
fi

PORT="$APP_PORT_1"
BASE_URL="$APP_BASE_URL_1"

echo "Port: $PORT"
echo "URL: $BASE_URL"
echo "Mode: ${TEST_MODE:-production}"
echo ""

# ============================================
# Kill previous processes
# ============================================
echo "Stopping previous frontends..."

# Kill processes on port range
for p in $(seq 50000 54999); do
    lsof -ti:$p 2>/dev/null | xargs kill -9 2>/dev/null || true
done

# Kill by process pattern
pkill -9 -f "vite.*--port" 2>/dev/null || true
pkill -9 -f "node.*vite" 2>/dev/null || true

sleep 1

# Verify port is free
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "Force killing port $PORT..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# ============================================
# Install dependencies
# ============================================
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install --silent 2>&1 || pnpm install
fi

# ============================================
# Start frontend
# ============================================
echo "Starting frontend..."

# Build environment variables
VITE_ENV="VITE_BASE_URL=$BASE_URL"

if [ "$TEST_MODE" = "test" ]; then
    VITE_ENV="$VITE_ENV VITE_WALLET_MODE=test"
    VITE_BASE="/"
    echo "Mode: TEST (base=/)"
else
    VITE_BASE=$(echo "$BASE_URL" | sed -E 's|^https?://[^/]+||')
    if [ -z "$VITE_BASE" ]; then
        VITE_BASE="/"
    elif [[ ! "$VITE_BASE" =~ /$ ]]; then
        VITE_BASE="$VITE_BASE/"
    fi
    echo "Mode: PRODUCTION (base=$VITE_BASE)"
fi

# Save project info
echo "$PROJECT_DIR" > /tmp/lumiovibe-current-project

if [ "$BACKGROUND" = "true" ]; then
    # Start in background
    nohup env $VITE_ENV pnpm vite --host --port $PORT --strictPort --base "$VITE_BASE" > "$LOG_FILE" 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > /tmp/lumiovibe-frontend-pid

    echo "PID: $FRONTEND_PID"
    echo "Log: $LOG_FILE"

    # Wait for server
    echo "Waiting for server..."
    for i in {1..30}; do
        if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
            echo ""
            echo "================================================"
            echo "  Frontend is running!"
            echo "================================================"
            echo ""
            echo "Local: http://localhost:$PORT"
            echo "External: $BASE_URL"
            echo ""
            exit 0
        fi
        sleep 1
        echo -n "."
    done

    echo ""
    echo "ERROR: Server didn't start"
    tail -20 "$LOG_FILE"
    exit 1
else
    # Start in foreground (for development)
    echo ""
    echo "Starting in foreground (Ctrl+C to stop)..."
    echo ""
    exec env $VITE_ENV pnpm vite --host --port $PORT --strictPort --base "$VITE_BASE"
fi
