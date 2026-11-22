# Build Optimization and Configuration Guide

## Overview

This guide covers build optimization techniques, configuration best practices, and performance improvements for the frontend application. It includes Vite configuration, asset optimization, bundle analysis, and deployment strategies.

## Vite Configuration

### Basic Configuration Structure

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    // Core configuration
    root: '.',
    build: { /* build options */ },
    server: { /* dev server options */ },
    preview: { /* preview server options */ },
    optimizeDeps: { /* dependency optimization */ },
    esbuild: { /* JavaScript transformation */ },
    define: { /* global constants */ }
  }
})
```

### Environment-Based Configuration

```javascript
export default defineConfig(({ mode }) => {
  // Determine environment based on mode
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    css: {
      devSourcemap: isDevelopment,
      postcss: './postcss.config.js',
      preprocessorOptions: {
        scss: {
          additionalData: `@import "src/scss/base/variables"; @import "src/scss/base/mixins";`,
          charset: false,
        },
      },
    },
    build: {
      sourcemap: isDevelopment,
      minify: isProduction ? 'esbuild' : false,
    },
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      minify: isProduction,
    }
  }
})
```

## Build Configuration

### Output Configuration

```javascript
build: {
  outDir: '../frontend_dist',
  emptyOutDir: true,
  sourcemap: isDevelopment,
  minify: isProduction ? 'esbuild' : false,
  target: 'esnext',

  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html')
    },
    output: {
      // Optimize chunk naming for better caching
      chunkFileNames: (chunkInfo) => {
        const facadeModuleId = chunkInfo.facadeModuleId
          ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.ts', '').replace('.js', '')
          : 'chunk';
        return `js/${facadeModuleId}-[hash].js`;
      },
      assetFileNames: (assetInfo) => {
        const info = assetInfo.name?.split('.') || [];
        const ext = info[info.length - 1];

        // Organize assets by type
        if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
          return `images/[name]-[hash][extname]`;
        }
        if (/css|scss/i.test(ext)) {
          return `css/[name]-[hash][extname]`;
        }
        if (/woff|woff2|ttf|otf|eot/i.test(ext)) {
          return `fonts/[name]-[hash][extname]`;
        }
        return `assets/[name]-[hash][extname]`;
      },
      manualChunks: {
        vendor: ['/src/polyfills.js'],
        'vendor-core': ['/src/main.js'],
      },
    },
    external: (id) => {
      return false; // Set to true for specific libs like 'lodash'
    },
  },
  chunkSizeWarningLimit: 1000,
}
```

### Asset Organization Strategy

```
frontend_dist/
├── index.html
├── js/
│   ├── script-[hash].js      # Main application code
│   ├── vendor-[hash].js      # Third-party libraries
│   └── chunk-[hash].js       # Dynamic imports
├── css/
│   ├── styles-[hash].css     # Compiled styles
│   └── vendor-[hash].css     # Third-party CSS
├── images/
│   ├── logo-[hash].png
│   └── icons-[hash].svg
└── fonts/
    └── inter-[hash].woff2
```

## Development Server Optimization

### Server Configuration

```javascript
server: {
  port: 5173,
  host: '0.0.0.0',
  strictPort: false,
  open: false, // Don't auto-open browser
  cors: true,

  // Optimize HMR for better development performance
  hmr: {
    port: 3001,
    overlay: true
  },

  // Optimize proxy for API calls
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      secure: false,
      configure: (proxy, options) => {
        proxy.on('error', (err, req, res) => {
          console.log('proxy error', err);
        });
        proxy.on('proxyReq', (proxyReq, req, res) => {
          proxyReq.setHeader('x-timestamp', Date.now().toString());
        });
        proxy.on('proxyRes', (proxyRes, req, res) => {
          proxyRes.headers['x-proxy-time'] = Date.now().toString();
        });
      }
    }
  },

  // Optimize file watching for better performance
  watch: {
    usePolling: false,
    interval: 100,
    ignored: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.log'
    ]
  },

  // Optimize server performance
  fs: {
    allow: ['..']
  }
}
```

### Hot Module Replacement (HMR) Optimization

```javascript
// Optimize HMR for large projects
hmr: {
  port: 3001,
  overlay: true,
  // Include only necessary files for HMR
  include: ['src/**/*'],
  exclude: ['node_modules/**', 'dist/**']
}
```

## Dependency Optimization

### Pre-bundling Configuration

```javascript
optimizeDeps: {
  // Pre-bundle dependencies for faster dev server startup
  include: [
    // Add commonly used dependencies here for faster loading
    // 'lodash', 'axios', etc.
  ],
  exclude: [
    // Exclude dependencies that should not be pre-bundled
  ],
  force: false
}
```

### Dependency Scanning

```javascript
// Force include specific deps that may cause issues
force: {
  include: ['problematic-dependency']
}
```

## Asset Optimization

### CSS Optimization

```javascript
css: {
  devSourcemap: true,
  postcss: './postcss.config.js',
  preprocessorOptions: {
    scss: {
      additionalData: `@import "src/scss/base/variables"; @import "src/scss/base/mixins";`,
      charset: false,
    },
  },
}
```

### Image Optimization

```javascript
// Automatic image optimization in build
build: {
  rollupOptions: {
    output: {
      assetFileNames: (assetInfo) => {
        if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name)) {
          return 'images/[name]-[hash][extname]';
        }
        return 'assets/[name]-[hash][extname]';
      }
    }
  }
}
```

### Font Optimization

```javascript
// Font loading optimization
const fontFiles = [
  'woff',
  'woff2',
  'ttf',
  'otf',
  'eot'
];

// In HTML head
const fontPreloads = fontFiles.map(ext =>
  `<link rel="preload" href="/fonts/inter.${ext}" as="font" type="font/${ext}" crossorigin>`
).join('\n');
```

## Performance Optimizations

### JavaScript Minification

```javascript
esbuild: {
  // Remove console logs and debugger statements in production
  drop: isProduction ? ['console', 'debugger'] : [],
  minify: isProduction,
  target: 'esnext'
}
```

### Tree Shaking

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // Separate vendor chunks for better caching
        vendor: ['react', 'react-dom'],
        ui: ['@mui/material', '@mui/icons-material'],
        utils: ['lodash', 'date-fns']
      }
    }
  }
}
```

### Code Splitting

```javascript
// Dynamic imports for route-based code splitting
const routes = [
  { path: '/dashboard', component: () => import('./pages/Dashboard') },
  { path: '/students', component: () => import('./pages/Students') },
  { path: '/drivers', component: () => import('./pages/Drivers') }
];

// In router
const loadComponent = (path) => {
  const route = routes.find(r => r.path === path);
  return route ? route.component() : import('./pages/NotFound');
};
```

## Environment Variables

### Environment Configuration

```javascript
define: {
  // Define environment variables for client-side code
  __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  __ENABLE_BUILD_OPTIMIZATIONS__: isProduction.toString(),
}
```

### Environment Files

```bash
# .env.development
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE="Student Profiles (Dev)"

# .env.production
VITE_API_URL=https://api.production.com
VITE_APP_TITLE="Student Profiles"
```

## Bundle Analysis

### Bundle Analyzer Setup

```javascript
// Install rollup-plugin-visualizer
npm install --save-dev rollup-plugin-visualizer

// In vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/report.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
})
```

### Bundle Analysis Commands

```json
{
  "scripts": {
    "analyze": "vite build --mode analyze",
    "analyze:dev": "vite build --mode development && open dist/report.html",
    "build:analyze": "vite build && npx vite-bundle-analyzer dist"
  }
}
```

## Performance Monitoring

### Build Performance Metrics

```javascript
// vite.config.js
export default defineConfig({
  build: {
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Log chunk sizes
        manualChunks: undefined, // Disable manual chunks for analysis
      }
    }
  }
})
```

### Performance Budgets

```javascript
// performance-budget.js
const budgets = {
  maxBundleSize: 500 * 1024, // 500KB
  maxChunkSize: 100 * 1024,  // 100KB
  maxAssetSize: 200 * 1024   // 200KB
};

export function checkBudgets() {
  // Implementation to check build output against budgets
}
```

## Deployment Optimization

### Production Build Commands

```json
{
  "scripts": {
    "build": "vite build",
    "build:prod": "vite build --mode production",
    "build:dev": "vite build --mode development",
    "preview": "vite preview",
    "preview:prod": "vite preview --mode production"
  }
}
```

### Multi-Environment Builds

```javascript
// vite.config.js for multiple environments
export default defineConfig(({ mode }) => {
  const environments = {
    development: {
      sourcemap: true,
      minify: false,
      target: 'esnext'
    },
    staging: {
      sourcemap: true,
      minify: true,
      target: 'es2020'
    },
    production: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2020'
    }
  };

  const config = environments[mode] || environments.development;

  return {
    build: {
      outDir: `dist-${mode}`,
      ...config
    }
  };
});
```

## Advanced Optimizations

### Compression Configuration

```javascript
// For advanced compression, install vite-plugin-compression
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      deleteOriginFile: false
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      deleteOriginFile: false
    })
  ]
})
```

### CDN Integration

```javascript
build: {
  rollupOptions: {
    external: ['react', 'react-dom'],
    output: {
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM'
      }
    }
  }
}
```

### Service Worker Optimization

```javascript
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/api\./,
          handler: 'NetworkFirst'
        }]
      }
    })
  ]
})
```

## Development Workflow Optimization

### Fast Refresh Configuration

```javascript
// Enable Fast Refresh for better DX
export default defineConfig({
  // Vite has Fast Refresh built-in for React
  // No additional configuration needed
})
```

### Development Tools Integration

```javascript
// .vscode/settings.json
{
  "vite.devCommand": "npm run dev",
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  }
}
```

## Troubleshooting Build Issues

### Common Build Errors

#### Issue 1: Module Resolution Errors

```javascript
// Fix module resolution
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '~': resolve(__dirname, 'src')
    }
  }
})
```

#### Issue 2: Large Bundle Size

```javascript
// Analyze and optimize bundle
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        charts: ['chart.js', 'd3'],
        utils: ['lodash', 'moment']
      }
    }
  }
}
```

#### Issue 3: CSS Import Errors

```javascript
// Fix CSS imports
css: {
  preprocessorOptions: {
    scss: {
      additionalData: `@import "src/scss/base/variables.scss";`
    }
  }
}
```

## Performance Best Practices

### 1. Optimize Dependencies

```bash
# Analyze dependency usage
npx vite-bundle-analyzer

# Remove unused dependencies
npm prune

# Use lighter alternatives
npm uninstall heavy-library
npm install lightweight-alternative
```

### 2. Image Optimization

```javascript
// Use modern image formats
const images = {
  webp: 'image.webp',
  avif: 'image.avif',
  original: 'image.png'
};

// In HTML
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.png" alt="fallback">
</picture>
```

### 3. Font Loading Strategy

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<!-- Fallback for non-critical fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

## Monitoring and Analytics

### Performance Monitoring Setup

```javascript
// performance-monitor.js
export function trackPerformance() {
  if ('performance' in window) {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart);
    });
  }
}
```

### Core Web Vitals Tracking

```javascript
// web-vitals.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## Related Documentation

- [Frontend Development Setup](frontend.md)
- [Component Registry System](../architecture/component-registry.md)
- [Development Workflow](development-workflow.md)
- [Troubleshooting Guide](../troubleshooting/TROUBLESHOOTING.md)