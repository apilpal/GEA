#!/bin/bash

echo "=== Running Puppeteer Test with Debug Output ==="
echo "Timestamp: $(date)"
echo ""

cd "$(dirname "$0")"

# Clean up any running jest processes
pkill -f jest || true
sleep 3

# Set environment variables for better debugging
export DEBUG=puppeteer:*
export NODE_ENV=test

echo "=== Starting Test ==="
echo ""

# Run the test with full output capture
timeout 120s npm test -- \
  ui-comprehensive-testing.puppeteer.test.ts \
  --testNamePattern="should show limited functionality indicators for guest users" \
  --verbose \
  --runInBand \
  --forceExit \
  --detectOpenHandles \
  2>&1 | tee test-debug-output.log

echo ""
echo "=== Test Execution Complete ==="
echo "Exit code: $?"
echo ""
echo "=== Last 50 lines of output ==="
tail -50 test-debug-output.log