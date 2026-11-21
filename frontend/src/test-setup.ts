// Test setup file for Jest configuration
import '@testing-library/jest-dom';

// Import and register custom elements
import './components/registry';

// Mock browser APIs
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        API_URL: 'http://localhost:8001',
        NODE_ENV: 'test',
        VITE_API_BASE_URL: 'http://127.0.0.1:8000/api',
        VITE_API_TIMEOUT: '10000',
        VITE_APP_NAME: 'School Management System',
        VITE_APP_VERSION: '1.0.0',
        VITE_APP_ENV: 'test',
        VITE_AUTH_REFRESH_THRESHOLD: '517300',
        VITE_ENABLE_DEBUG_MODE: 'false',
        VITE_ENABLE_ANALYTICS: 'false',
        VITE_ENABLE_ERROR_REPORTING: 'false',
        VITE_DEFAULT_THEME: 'light',
        VITE_ENABLE_DARK_MODE: 'true',
        VITE_ENABLE_SERVICE_WORKER: 'false',
        VITE_CACHE_EXPIRY: '3600000',
        VITE_API_RATE_LIMIT: '100',
        VITE_API_RATE_WINDOW: '60000'
      }
    }
  },
  writable: true
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(global.window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.getComputedStyle
Object.defineProperty(global.window, 'getComputedStyle', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getPropertyValue: jest.fn(),
    marginTop: '0px',
    marginBottom: '0px',
    marginLeft: '0px',
    marginRight: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
  })),
});

// Mock localStorage
Object.defineProperty(global.window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Mock sessionStorage
Object.defineProperty(global.window, 'sessionStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});