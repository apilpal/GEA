#!/bin/bash

echo "Running test: should show limited functionality indicators for guest users"
echo "=================================================="

cd "$(dirname "$0")"

# Kill any existing jest processes
pkill -f jest || true
sleep 2

# Run the specific test
npm test -- ui-comprehensive-testing.puppeteer.test.ts --testNamePattern="should show limited functionality indicators for guest users" --verbose --runInBand --forceExit

echo "=================================================="
echo "Test execution completed"