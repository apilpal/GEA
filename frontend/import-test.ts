// Import verification test script for barrel files
// This script tests that all exports from the main barrel files can be imported successfully

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  exports?: string[];
}

interface TestSuite {
  name: string;
  results: TestResult[];
}

// Test services barrel file
async function testServicesImports(): Promise<TestResult> {
  try {
    console.log('Testing services imports from frontend/src/ts/services/index.ts...');

    // Import all services
    const servicesModule = await import('./src/ts/services/index.js');

    const expectedExports = [
      'apiService',
      'authService',
      'chatService',
      'studentService',
      'themeService',
      'Theme'
    ];

    const actualExports = Object.keys(servicesModule);

    console.log('✓ Services imported successfully');
    console.log('Available exports:', actualExports);

    // Check if all expected exports are present
    const missingExports = expectedExports.filter(exp => !actualExports.includes(exp));

    if (missingExports.length > 0) {
      return {
        name: 'Services Imports',
        success: false,
        error: `Missing exports: ${missingExports.join(', ')}`,
        exports: actualExports
      };
    }

    return {
      name: 'Services Imports',
      success: true,
      exports: actualExports
    };

  } catch (error) {
    return {
      name: 'Services Imports',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test store barrel file
async function testStoreImports(): Promise<TestResult> {
  try {
    console.log('Testing store imports from frontend/src/ts/store/core/index.ts...');

    // Import all store modules
    const storeModule = await import('./src/ts/store/core/index.js');

    const actualExports = Object.keys(storeModule);

    console.log('✓ Store modules imported successfully');
    console.log('Available exports:', actualExports);

    return {
      name: 'Store Imports',
      success: true,
      exports: actualExports
    };

  } catch (error) {
    return {
      name: 'Store Imports',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Test components barrel file
async function testComponentsImports(): Promise<TestResult> {
  try {
    console.log('Testing components imports from frontend/src/ts/components/index.ts...');

    // Import all components
    const componentsModule = await import('./src/ts/components/index.js');

    const actualExports = Object.keys(componentsModule);

    console.log('✓ Components imported successfully');
    console.log('Available exports:', actualExports);

    return {
      name: 'Components Imports',
      success: true,
      exports: actualExports
    };

  } catch (error) {
    return {
      name: 'Components Imports',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Run all tests
async function runAllTests(): Promise<TestSuite> {
  console.log('='.repeat(60));
  console.log('BARREL FILE IMPORT VERIFICATION TEST');
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  // Test each barrel file
  results.push(await testServicesImports());
  console.log('');

  results.push(await testStoreImports());
  console.log('');

  results.push(await testComponentsImports());
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

  return {
    name: 'Barrel File Import Tests',
    results
  };
}

// Execute tests if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests, testServicesImports, testStoreImports, testComponentsImports };