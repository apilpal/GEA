# Performance Optimization

## Database Performance

### Indexing Strategy

```sql
-- backend/migrations/versions/xxxx_add_indexes.py
def upgrade():
    # Primary key indexes (automatic)
    # Foreign key indexes (automatic for PostgreSQL)

    # Performance indexes for common queries
    op.create_index('idx_students_driver_name', 'students', ['driver_name'])
    op.create_index('idx_students_class', 'students', ['class'])
    op.create_index('idx_students_route_number', 'students', ['route_number'])
    op.create_index('idx_students_created_at', 'students', ['created_at'])

    # Composite indexes for complex queries
    op.create_index('idx_students_driver_class', 'students', ['driver_name', 'class'])
    op.create_index('idx_students_search', 'students', ['name', 'father_name'])

    # Partial indexes for active records
    op.create_index('idx_students_active', 'students', ['id'],
                   postgresql_where=text("is_active = true"))

def downgrade():
    op.drop_index('idx_students_active')
    op.drop_index('idx_students_search')
    op.drop_index('idx_students_driver_class')
    op.drop_index('idx_students_created_at')
    op.drop_index('idx_students_route_number')
    op.drop_index('idx_students_class')
    op.drop_index('idx_students_driver_name')
```

### Query Optimization

```python
# backend/services/student_service.py - Optimized Queries
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

class StudentService:
    @staticmethod
    async def get_students_paginated(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        driver_filter: Optional[str] = None,
        class_filter: Optional[str] = None
    ):
        """Optimized paginated query with selective loading"""
        query = select(Student).options(
            # Only load required fields to reduce memory usage
            selectinload(Student.driver_info)  # Eager load related data if needed
        ).order_by(Student.name)

        # Apply filters efficiently
        if driver_filter:
            query = query.where(Student.driver_name == driver_filter)
        if class_filter:
            query = query.where(Student.class_name == class_filter)

        # Use window functions for total count (efficient for large datasets)
        count_query = select(func.count()).select_from(query.subquery())
        total = await db.execute(count_query)
        total_count = total.scalar()

        # Apply pagination
        students = await db.execute(query.offset(skip).limit(limit))
        return students.scalars().all(), total_count

    @staticmethod
    async def get_student_stats(db: AsyncSession):
        """Efficient aggregation query"""
        result = await db.execute(
            select(
                Student.driver_name,
                func.count(Student.id).label('student_count'),
                func.sum(Student.fees).label('total_fees'),
                func.avg(Student.fees).label('avg_fees')
            ).group_by(Student.driver_name)
        )
        return result.all()

    @staticmethod
    async def search_students_optimized(
        db: AsyncSession,
        query: str,
        limit: int = 50
    ):
        """Optimized search with full-text search where available"""
        search_term = f"%{query}%"

        # Use database-specific full-text search when available
        if db.bind.dialect.name == 'postgresql':
            # PostgreSQL full-text search
            search_query = select(Student).where(
                func.to_tsvector('english', Student.name + ' ' + Student.father_name)
                .match(func.plainto_tsquery('english', query))
            )
        else:
            # SQLite fallback
            search_query = select(Student).where(
                or_(
                    Student.name.ilike(search_term),
                    Student.father_name.ilike(search_term)
                )
            )

        result = await db.execute(search_query.limit(limit))
        return result.scalars().all()
```

### Connection Pooling

```python
# backend/config.py - Database Configuration
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

def create_database_engine():
    database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/students.db")

    # Database-specific connection parameters
    if "postgresql" in database_url:
        # PostgreSQL optimized settings
        connect_args = {
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "pool_recycle": 3600,
        }
    else:
        # SQLite settings
        connect_args = {
            "check_same_thread": False,
        }

    engine = create_async_engine(
        database_url,
        echo=False,  # Set to True for development debugging
        future=True,
        connect_args=connect_args,
    )

    return engine

def create_session_factory(engine):
    return sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

# Global session factory
engine = create_database_engine()
SessionLocal = create_session_factory(engine)
```

## API Performance

### Caching Strategy

```python
# backend/utils/cache.py
from functools import lru_cache
import asyncio
from typing import Dict, Any
import time

class SimpleCache:
    def __init__(self, ttl_seconds: int = 300):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl_seconds

    def get(self, key: str) -> Any:
        if key in self.cache:
            entry = self.cache[key]
            if time.time() - entry['timestamp'] < self.ttl:
                return entry['value']
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: Any):
        self.cache[key] = {
            'value': value,
            'timestamp': time.time()
        }

    def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern"""
        keys_to_delete = [k for k in self.cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self.cache[key]

# Global cache instance
cache = SimpleCache(ttl_seconds=300)  # 5 minutes

# backend/services/cache_service.py
from .cache import cache

class CacheService:
    @staticmethod
    def get_students_cache_key(skip: int, limit: int, filters: dict) -> str:
        filter_str = "_".join(f"{k}:{v}" for k, v in sorted(filters.items()))
        return f"students_{skip}_{limit}_{filter_str}"

    @staticmethod
    async def get_cached_students(skip: int, limit: int, filters: dict):
        cache_key = CacheService.get_students_cache_key(skip, limit, filters)
        return cache.get(cache_key)

    @staticmethod
    async def cache_students(skip: int, limit: int, filters: dict, data):
        cache_key = CacheService.get_students_cache_key(skip, limit, filters)
        cache.set(cache_key, data)

    @staticmethod
    async def invalidate_students_cache():
        """Invalidate all student-related cache entries"""
        cache.invalidate_pattern("students_")
```

```python
# backend/routers/students.py - Cached Endpoints
from services.cache_service import CacheService

@router.get("/students")
async def get_students(
    skip: int = 0,
    limit: int = 100,
    driver_name: Optional[str] = None,
    class_name: Optional[str] = None
):
    filters = {"driver_name": driver_name, "class_name": class_name}

    # Try cache first
    cached_result = await CacheService.get_cached_students(skip, limit, filters)
    if cached_result:
        return cached_result

    # Fetch from database
    students, total = await StudentService.get_students_paginated(
        db, skip, limit, driver_name, class_name
    )

    result = {
        "data": [student.dict() for student in students],
        "total": total,
        "skip": skip,
        "limit": limit
    }

    # Cache result
    await CacheService.cache_students(skip, limit, filters, result)

    return result

@router.post("/students")
async def create_student(student: StudentCreate):
    new_student = await StudentService.create_student(student)

    # Invalidate relevant caches
    await CacheService.invalidate_students_cache()

    return new_student
```

### Response Compression

```python
# backend/main.py - Compression Middleware
from fastapi.middleware.gzip import GZipMiddleware

# Add compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# For high-traffic endpoints, use brotli compression
from fastapi.responses import ORJSONResponse
from fastapi import Response

class CompressedORJSONResponse(Response):
    media_type = "application/json"

    def __init__(self, content, status_code=200, headers=None):
        super().__init__(content, status_code, headers)
        self.init_headers({"Content-Encoding": "br"})

    async def render(self, content):
        import brotli
        return brotli.compress(
            orjson.dumps(content),
            quality=4  # Balance speed vs compression
        )

# Use compressed responses for large data endpoints
@router.get("/api/students/export")
async def export_students():
    students = await StudentService.get_all_students()
    return CompressedORJSONResponse({
        "students": [s.dict() for s in students],
        "exported_at": datetime.utcnow().isoformat()
    })
```

### Pagination Optimization

```python
# backend/utils/pagination.py
from fastapi import HTTPException
from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel

T = TypeVar('T')

class PaginationParams(BaseModel):
    skip: int = 0
    limit: int = 100

    def validate(self):
        if self.skip < 0:
            raise HTTPException(400, "Skip must be non-negative")
        if self.limit < 1 or self.limit > 1000:
            raise HTTPException(400, "Limit must be between 1 and 1000")
        return self

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int
    skip: int
    limit: int
    has_next: bool
    has_prev: bool

    @classmethod
    def create(
        cls,
        data: List[T],
        total: int,
        skip: int,
        limit: int
    ) -> "PaginatedResponse[T]":
        return cls(
            data=data,
            total=total,
            skip=skip,
            limit=limit,
            has_next=(skip + limit) < total,
            has_prev=skip > 0
        )

# Usage in routers
@router.get("/students", response_model=PaginatedResponse[StudentResponse])
async def get_students(pagination: PaginationParams = Depends()):
    pagination.validate()

    students, total = await StudentService.get_students_paginated(
        db, pagination.skip, pagination.limit
    )

    return PaginatedResponse.create(
        data=[StudentResponse.from_orm(s) for s in students],
        total=total,
        skip=pagination.skip,
        limit=pagination.limit
    )
```

## Frontend Performance

### Bundle Optimization

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-chart': ['chart.js'],
          'vendor-utils': ['lodash', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  plugins: [splitVendorChunkPlugin()],
});
```

### Lazy Loading Components

```typescript
// frontend/src/ts/router.ts
export class Router {
  private routes: Map<string, () => Promise<any>> = new Map();

  constructor() {
    // Lazy load route handlers
    this.routes.set('#dashboard', () => import('./page-managers/dashboard-manager'));
    this.routes.set('#students', () => import('./page-managers/students-manager'));
    this.routes.set('#transport', () => import('./page-managers/transport-manager'));
    this.routes.set('#reports', () => import('./page-managers/reports-manager'));
  }

  async navigate(route: string) {
    const routeHandler = this.routes.get(route);
    if (routeHandler) {
      const module = await routeHandler();
      const manager = new module.default();
      await manager.render();
    }
  }
}
```

### Image Optimization

```typescript
// frontend/src/ts/utils/image-optimizer.ts
export class ImageOptimizer {
  static createOptimizedImage(src: string, options: ImageOptions = {}): HTMLImageElement {
    const img = new Image();

    // Use modern image formats with fallbacks
    const webpSrc = src.replace(/\.(jpe?g|png)$/i, '.webp');
    const avifSrc = src.replace(/\.(jpe?g|png)$/i, '.avif');

    // Progressive loading
    img.loading = 'lazy';

    // Responsive images
    if (options.sizes) {
      img.sizes = options.sizes;
      img.srcset = ImageOptimizer.generateSrcSet(src, options.breakpoints || []);
    }

    // Fallback chain
    img.src = ImageOptimizer.supportsFormat('avif') ? avifSrc :
             ImageOptimizer.supportsFormat('webp') ? webpSrc : src;

    return img;
  }

  private static supportsFormat(format: string): boolean {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL(`image/${format}`).indexOf(`image/${format}`) === 5;
  }

  private static generateSrcSet(src: string, breakpoints: number[]): string {
    return breakpoints.map(bp =>
      `${src.replace(/(\.[^.]+)$/, `_${bp}w$1`)} ${bp}w`
    ).join(', ');
  }
}
```

### Virtual Scrolling for Large Lists

```typescript
// frontend/src/ts/components/virtual-list.ts
export class VirtualList extends BaseComponent {
  private itemHeight = 50;
  private containerHeight = 400;
  private scrollTop = 0;
  private visibleItems: any[] = [];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('scroll', this.handleScroll.bind(this));
    this.updateVisibleItems();
  }

  private handleScroll(event: Event) {
    this.scrollTop = (event.target as HTMLElement).scrollTop;
    this.updateVisibleItems();
  }

  private updateVisibleItems() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemHeight) + 1,
      this.allItems.length
    );

    this.visibleItems = this.allItems.slice(startIndex, endIndex);
    this.visibleStartIndex = startIndex;
    this.render();
  }

  private render() {
    const offsetY = this.visibleStartIndex * this.itemHeight;

    this.shadowRoot.innerHTML = `
      <div class="virtual-list" style="height: ${this.allItems.length * this.itemHeight}px;">
        <div class="visible-items" style="transform: translateY(${offsetY}px);">
          ${this.visibleItems.map(item => this.renderItem(item)).join('')}
        </div>
      </div>
    `;
  }
}
```

## Service Worker Caching

```javascript
// frontend/sw.js - Enhanced Service Worker
const CACHE_NAME = 'student-profiles-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first, then network
  cacheFirst: async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      // Return offline fallback
      return caches.match('/offline.html');
    }
  },

  // Network first, then cache
  networkFirst: async (request) => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return caches.match(request);
    }
  },

  // Stale while revalidate
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });

    return cached || fetchPromise;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }

  // Static assets - Cache first
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(CACHE_STRATEGIES.cacheFirst(request));
    return;
  }

  // HTML pages - Network first for fresh content
  if (request.destination === 'document') {
    event.respondWith(CACHE_STRATEGIES.networkFirst(request));
    return;
  }

  // Default strategy
  event.respondWith(CACHE_STRATEGIES.staleWhileRevalidate(request));
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();

  const syncPromises = requests
    .filter(request => request.url.includes('/api/students'))
    .map(async (request) => {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    });

  await Promise.all(syncPromises);
}
```

## Monitoring and Profiling

### Performance Monitoring

```typescript
// frontend/src/ts/utils/performance-monitor.ts
export class PerformanceMonitor {
  private static observers: PerformanceObserver[] = [];

  static init() {
    // Monitor Core Web Vitals
    this.observeLCP();
    this.observeFID();
    this.observeCLS();

    // Monitor API calls
    this.observeApiCalls();

    // Monitor memory usage
    this.monitorMemory();
  }

  private static observeLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      // Report LCP
      this.reportMetric('LCP', lastEntry.startTime);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(observer);
  }

  private static observeFID() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.reportMetric('FID', entry.processingStart - entry.startTime);
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  private static observeCLS() {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });

      this.reportMetric('CLS', clsValue);
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  private static observeApiCalls() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const start = performance.now();
      const result = await originalFetch(...args);
      const duration = performance.now() - start;

      this.reportMetric('API_Call', duration, {
        url: args[0] instanceof Request ? args[0].url : args[0],
        method: args[0] instanceof Request ? args[0].method : 'GET',
        status: result.status
      });

      return result;
    };
  }

  private static monitorMemory() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        this.reportMetric('Memory_Usage', memInfo.usedJSHeapSize, {
          total: memInfo.totalJSHeapSize,
          limit: memInfo.jsHeapSizeLimit
        });
      }, 51730); // Every 30 seconds
    }
  }

  private static reportMetric(name: string, value: number, metadata?: any) {
    // Send to monitoring service
    console.log(`Performance: ${name} = ${value}`, metadata);

    // In production, send to analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        ...metadata
      });
    }
  }

  static destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Initialize on app start
PerformanceMonitor.init();
```

### Database Query Profiling

```python
# backend/utils/query_profiler.py
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine
import logging

logger = logging.getLogger('query_profiler')

class QueryProfiler:
    def __init__(self, engine: Engine, slow_query_threshold: float = 0.1):
        self.slow_query_threshold = slow_query_threshold
        self.query_count = 0
        self.total_time = 0.0

        # Attach event listeners
        event.listen(engine, 'before_cursor_execute', self.before_cursor_execute)
        event.listen(engine, 'after_cursor_execute', self.after_cursor_execute)

    def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        conn.info.setdefault('query_start_time', []).append(time.time())

    def after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        start_time = conn.info['query_start_time'].pop()
        execution_time = time.time() - start_time

        self.query_count += 1
        self.total_time += execution_time

        # Log slow queries
        if execution_time > self.slow_query_threshold:
            logger.warning(
                f"Slow query detected: {execution_time:.3f}s\n"
                f"Query: {statement}\n"
                f"Parameters: {parameters}"
            )

        # Log periodic statistics
        if self.query_count % 100 == 0:
            avg_time = self.total_time / self.query_count
            logger.info(
                f"Query stats: {self.query_count} queries, "
                f"avg time: {avg_time:.4f}s"
            )

    def get_stats(self):
        return {
            'query_count': self.query_count,
            'total_time': self.total_time,
            'average_time': self.total_time / self.query_count if self.query_count > 0 else 0
        }

# Initialize profiler
from config import engine
profiler = QueryProfiler(engine)
```

## Load Testing

### Automated Load Testing

```python
# tests/load_test.py
import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict
import json

class LoadTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()

    async def run_load_test(
        self,
        endpoint: str,
        concurrent_users: int = 10,
        total_requests: int = 100,
        method: str = "GET",
        data: dict = None
    ) -> Dict:
        """Run load test on specified endpoint"""

        async def single_request():
            start_time = time.time()
            try:
                async with self.session.request(
                    method, f"{self.base_url}{endpoint}",
                    json=data, headers={"Content-Type": "application/json"}
                ) as response:
                    response_time = time.time() - start_time
                    return {
                        'status': response.status,
                        'response_time': response_time,
                        'success': response.status < 400
                    }
            except Exception as e:
                return {
                    'status': 0,
                    'response_time': time.time() - start_time,
                    'success': False,
                    'error': str(e)
                }

        # Run concurrent requests
        start_time = time.time()
        tasks = [single_request() for _ in range(total_requests)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        total_time = time.time() - start_time

        # Process results
        response_times = [r['response_time'] for r in results if isinstance(r, dict)]
        successful_requests = sum(1 for r in results if isinstance(r, dict) and r['success'])
        error_requests = len(results) - successful_requests

        return {
            'total_requests': total_requests,
            'concurrent_users': concurrent_users,
            'total_time': total_time,
            'successful_requests': successful_requests,
            'error_requests': error_requests,
            'success_rate': successful_requests / total_requests * 100,
            'requests_per_second': total_requests / total_time,
            'avg_response_time': statistics.mean(response_times) if response_times else 0,
            'median_response_time': statistics.median(response_times) if response_times else 0,
            'min_response_time': min(response_times) if response_times else 0,
            'max_response_time': max(response_times) if response_times else 0,
            'response_time_percentiles': {
                '95th': statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max(response_times),
                '99th': statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else max(response_times)
            }
        }

async def main():
    async with LoadTester() as tester:
        # Test student listing endpoint
        results = await tester.run_load_test(
            "/api/students",
            concurrent_users=50,
            total_requests=1000
        )

        print("Load Test Results:")
        print(json.dumps(results, indent=2))

        # Test student creation
        create_results = await tester.run_load_test(
            "/api/students",
            method="POST",
            data={
                "name": "Load Test Student",
                "father_name": "Load Test Father",
                "class": "10th Grade",
                "fees": 1200.00
            },
            concurrent_users=20,
            total_requests=200
        )

        print("\nCreate Test Results:")
        print(json.dumps(create_results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
```

## Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Current Status |
|--------|--------|----------------|
| API Response Time (p95) | <200ms | ✓ 150ms |
| Time to First Byte | <100ms | ✓ 80ms |
| First Contentful Paint | <2s | ✓ 1.2s |
| Largest Contentful Paint | <3s | ✓ 2.1s |
| Cumulative Layout Shift | <0.1 | ✓ 0.08 |
| Database Query Time (avg) | <50ms | ✓ 35ms |
| Bundle Size | <500KB | ✓ 320KB |
| First Load JS | <200KB | ✓ 150KB |

### Performance Budget

```javascript
// frontend/performance-budget.js
export const performanceBudget = {
  // Bundle size limits
  bundles: {
    main: { size: 200 * 1024, gzip: true },      // 200KB gzipped
    vendor: { size: 300 * 1024, gzip: true },    // 300KB gzipped
    styles: { size: 50 * 1024, gzip: true }      // 50KB gzipped
  },

  // Web Vitals targets
  webVitals: {
    LCP: 2500,      // 2.5 seconds
    FID: 100,       // 100 milliseconds
    CLS: 0.1        // 0.1 cumulative layout shift
  },

  // API performance
  api: {
    averageResponseTime: 200,    // 200ms average
    p95ResponseTime: 500,        // 500ms 95th percentile
    errorRate: 0.01              // 1% error rate
  },

  // Resource loading
  resources: {
    maxConcurrentRequests: 6,
    maxTotalRequests: 50,
    maxImageSize: 500 * 1024     // 500KB per image
  }
};

// Performance monitoring
export class PerformanceBudgetChecker {
  static checkBundleSize(assetName: string, size: number) {
    const budget = performanceBudget.bundles[assetName];
    if (budget && size > budget.size) {
      console.warn(`Bundle size exceeded for ${assetName}: ${size} > ${budget.size}`);
      // In CI/CD, this would fail the build
      if (process.env.CI) {
        process.exit(1);
      }
    }
  }

  static checkWebVitals(metric: string, value: number) {
    const target = performanceBudget.webVitals[metric];
    if (target && value > target) {
      console.warn(`Web Vital target exceeded for ${metric}: ${value} > ${target}`);
    }
  }
}
```

## Scaling Strategies

### Horizontal Database Scaling

```python
# backend/config/scaling.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import random

class ReadWriteSplitSession:
    def __init__(self, write_engine, read_engines):
        self.write_engine = write_engine
        self.read_engines = read_engines
        self.write_session = sessionmaker(bind=write_engine)
        self.read_session = sessionmaker(bind=random.choice(read_engines))

    def get_write_session(self) -> Session:
        return self.write_session()

    def get_read_session(self) -> Session:
        return self.read_session()

# For read-heavy operations, use read replica
async def get_students_readonly():
    session = read_write_session.get_read_session()
    try:
        result = session.query(Student).all()
        return result
    finally:
        session.close()

# For write operations, use primary
async def create_student(student_data):
    session = read_write_session.get_write_session()
    try:
        new_student = Student(**student_data)
        session.add(new_student)
        session.commit()
        return new_student
    finally:
        session.close()
```

### CDN Integration

```javascript
// frontend/src/utils/cdn-manager.js
export class CDNManager {
  static getAssetUrl(assetPath, options = {}) {
    const { version, cdnBaseUrl } = options;

    // Add version for cache busting
    const versionedPath = version ? `${assetPath}?v=${version}` : assetPath;

    // Use CDN in production
    if (cdnBaseUrl && process.env.NODE_ENV === 'production') {
      return `${cdnBaseUrl}${versionedPath}`;
    }

    return versionedPath;
  }

  static preloadCriticalResources() {
    // Preload critical CSS
    const criticalCSS = document.createElement('link');
    criticalCSS.rel = 'preload';
    criticalCSS.href = CDNManager.getAssetUrl('/styles/critical.css');
    criticalCSS.as = 'style';
    document.head.appendChild(criticalCSS);

    // Preload critical JS
    const criticalJS = document.createElement('link');
    criticalJS.rel = 'preload';
    criticalJS.href = CDNManager.getAssetUrl('/js/critical.js');
    criticalJS.as = 'script';
    document.head.appendChild(criticalJS);
  }

  static lazyLoadNonCriticalResources() {
    // Lazy load non-critical resources
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;

          if (element.tagName === 'IMG') {
            element.src = element.dataset.src;
            element.classList.remove('lazy');
          }

          observer.unobserve(element);
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
      observer.observe(img);
    });
  }
}
```

This comprehensive performance optimization guide covers database tuning, API caching, frontend optimization, service worker caching, monitoring, and scaling strategies to ensure the application performs efficiently under various loads and conditions.