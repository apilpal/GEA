// Simple ESM test to verify barrel file imports
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImport(filePath, description) {
  try {
    console.log(`Testing ${description}...`);

    const fullPath = path.join(__dirname, filePath);
    const jsPath = fullPath.replace('.ts', '.js');

    if (!fs.existsSync(jsPath)) {
      console.log(`✗ ${description}: File not found - ${jsPath}`);
      return false;
    }

    const module = await import(jsPath);
    const exports = Object.keys(module);

    console.log(`✓ ${description}: Successfully imported`);
    console.log(`  Exports: ${exports.join(', ')}`);

    return true;

  } catch (error) {
    console.log(`✗ ${description}: Import failed - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('BARREL FILE IMPORT VERIFICATION TEST');
  console.log('====================================');

  const results = [];

  // Test services barrel file
  results.push(await testImport('src/ts/services/index.ts', 'Services Barrel File'));

  // Test store barrel file
  results.push(await testImport('src/ts/store/core/index.ts', 'Store Barrel File'));

  // Test components barrel file
  results.push(await testImport('src/ts/components/index.ts', 'Components Barrel File'));

  const successCount = results.filter(Boolean).length;
  const totalCount = results.length;

  console.log('\n====================================');
  console.log(`SUMMARY: ${successCount}/${totalCount} tests passed`);

  if (successCount === totalCount) {
    console.log('All barrel files imported successfully!');
  } else {
    console.log('Some imports failed. Check the errors above.');
  }
}

runTests().catch(console.error);