module.exports = {
  preset: 'jest-puppeteer',

  // Use ESM preset for better ES module support

  // jest-puppeteer preset provides its own test environment
  // Don't override with jsdom as it conflicts with puppeteer setup

  // Enhanced module resolution
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Optimized test matching patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],

  // Setup files for comprehensive test environment
  setupFilesAfterEnv: [
    '<rootDir>/jest-puppeteer.setup.js'
  ],

  // Enhanced coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/*.d.ts',
    '!**/dist/**',
    '!**/build/**',
    '!src/js/**/*',
    '!**/test-setup.ts',
    '!src/test-utils.ts',
    '!src/mocks/**/*'
  ],
  coverageDirectory: '../frontend_coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
    'json-summary'
  ],

  // Performance optimizations
  maxWorkers: '50%', // Use 50% of available cores for better performance
  cache: true,
  clearMocks: true,

  // Enhanced transform configuration for better ESM support
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: './tsconfig.jest.json'
    }],
    '^.+\\.(js|jsx)$': ['ts-jest', {
      useESM: true
    }]
  },

  // Improved module name mapping for ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)$': '$1',
    '^(\\.{1,2}/.*)\\?esm$': '$1',
    // Handle TypeScript extensions for ESM
    '^(\\.{1,2}/.*)\\.ts$': '$1'
  },

  // Better transform ignore patterns for performance
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@jest|jest-runtime|canvas))'
  ],


  // Test timeout and retry configuration
  testTimeout: 10000,

  // Reporter configuration for better output
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '../test-results',
      outputName: 'jest-junit.xml',
      classNameTemplate: '{classname}-{title}',
      titleTemplate: '{classname}-{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],

  // Performance and memory optimizations
  detectOpenHandles: true,
  forceExit: true,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],

  // Module directories for better resolution
  moduleDirectories: ['node_modules', 'src', '<rootDir>'],

  // Test URL for jsdom (moved to testEnvironmentOptions)
};