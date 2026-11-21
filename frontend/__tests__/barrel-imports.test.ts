// Import verification tests for barrel files
// Tests that all exports from the main barrel files can be imported successfully

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  exports?: string[];
}

describe('Barrel File Import Verification', () => {
  describe('Services Barrel File', () => {
    test('should import all services from frontend/src/ts/services/index.ts', async () => {
      try {
        // Import all services
        const servicesModule = await import('../src/ts/services/index.js');

        const expectedExports = [
          'apiService',
          'authService',
          'chatService',
          'studentService',
          'themeService',
          'Theme'
        ];

        const actualExports = Object.keys(servicesModule);

        console.log('Services imported successfully');
        console.log('Available exports:', actualExports);

        // Check if all expected exports are present
        const missingExports = expectedExports.filter(exp => !actualExports.includes(exp));

        if (missingExports.length > 0) {
          throw new Error(`Missing exports: ${missingExports.join(', ')}`);
        }

        expect(actualExports).toEqual(expect.arrayContaining(expectedExports));
        expect(missingExports).toHaveLength(0);

      } catch (error) {
        throw new Error(`Failed to import services: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  describe('Store Barrel File', () => {
    test('should import all store modules from frontend/src/ts/store/core/index.ts', async () => {
      try {
        // Import all store modules
        const storeModule = await import('../src/ts/store/core/index.js');

        const actualExports = Object.keys(storeModule);

        console.log('Store modules imported successfully');
        console.log('Available exports:', actualExports);

        expect(actualExports.length).toBeGreaterThan(0);

      } catch (error) {
        throw new Error(`Failed to import store modules: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  describe('Components Barrel File', () => {
    test('should import all components from frontend/src/ts/components/index.ts', async () => {
      try {
        // Import all components
        const componentsModule = await import('../src/ts/components/index.js');

        const actualExports = Object.keys(componentsModule);

        console.log('Components imported successfully');
        console.log('Available exports:', actualExports);

        expect(actualExports.length).toBeGreaterThan(0);

      } catch (error) {
        throw new Error(`Failed to import components: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  describe('Integration Test', () => {
    test('should be able to import from all barrel files simultaneously', async () => {
      try {
        // Import from all barrel files at once
        const [servicesModule, storeModule, componentsModule] = await Promise.all([
          import('../src/ts/services/index.js'),
          import('../src/ts/store/core/index.js'),
          import('../src/ts/components/index.js')
        ]);

        // Verify each module has exports
        expect(Object.keys(servicesModule).length).toBeGreaterThan(0);
        expect(Object.keys(storeModule).length).toBeGreaterThan(0);
        expect(Object.keys(componentsModule).length).toBeGreaterThan(0);

        console.log('All barrel files imported successfully in parallel');

      } catch (error) {
        throw new Error(`Failed to import from barrel files simultaneously: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });
});