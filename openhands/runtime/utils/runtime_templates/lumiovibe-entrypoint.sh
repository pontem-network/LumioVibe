#!/bin/bash
# LumioVibe Entrypoint - runs on EVERY container start
# Prepares unique account and pre-compiled template per session

MARKER_FILE=/workspace/.lumio-initialized

# Only run once per workspace
if [ -f "$MARKER_FILE" ]; then
    exec "$@"
    exit 0
fi

echo "=== Initializing LumioVibe Environment ==="

# Run the init script
if [ -f /openhands/runtime/utils/runtime_templates/lumio-init.sh ]; then
    bash /openhands/runtime/utils/runtime_templates/lumio-init.sh
    touch "$MARKER_FILE"
else
    echo "⚠ lumio-init.sh not found, skipping"
fi

echo "=== LumioVibe Ready ==="

# Execute the original command
exec "$@"
