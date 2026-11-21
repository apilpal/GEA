// Simple Node.js script to test barrel file imports
// This script tests that all exports from the main barrel files can be imported successfully

const fs = require('fs');
const path = require('path');

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  exports?: string[];
}

async function testImport(filePath, description) {
  try {
    console.log(`Testing ${description}...`);

    // Convert TypeScript path to JavaScript for Node.js import
    const jsPath = filePath.replace('.ts', '.js');

    // Check if the file exists
    if (!fs.existsSync(path.join(__dirname, jsPath))) {
      return {
        name: description,
        success: false,
        error: `File not found: ${jsPath}`
      };
    }

    // Try to import the module
    const module = await import(path.join(__dirname, jsPath));
    const exports = Object.keys(module);

    console.log(`✓ ${description} imported successfully`);
    console.log(`  Available exports: ${exports.join(', ')}`);

    return {
      name: description,
      success: true,
      exports: exports
    };

  } catch (error) {
    return {
      name: description,
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('BARREL FILE IMPORT VERIFICATION TEST');
  console.log('='.repeat(60));

  const results = [];

  // Test services barrel file
  results.push(await testImport('src/ts/services/index.ts', 'Services Barrel File'));
  console.log('');

  // Test store barrel file
  results.push(await testImport('src/ts/store/core/index.ts', 'Store Barrel File'));
  console.log('');

  // Test components barrel file
  results.push(await testImport('src/ts/components/index.ts', 'Components Barrel File'));
  console.log('');

  // Summary
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log('='.repeat(60));
  console.log(`TEST SUMMARY: ${successCount}/${totalCount} tests passed`);
  console.log('='.repeat(60));

  results.forEach(result => {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${result.name}`);
    if (!result.success && result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });

  return results;
}

// Run the tests
runTests().then(results => {
  const hasFailures = results.some(r => !r.success);
  process.exit(hasFailures ? 1 : 0);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});