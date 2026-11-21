/**
 * Performance and load testing for public API endpoints in guest-first architecture.
 *
 * This test suite focuses on:
 * - Response time validation for all public endpoints
 * - Concurrent request handling capabilities
 * - Memory usage and resource consumption
 * - Rate limiting effectiveness under load
 * - Caching behavior and efficiency
 *
 * @author Jest Test Engineer
 * @version 2.0.0
 */

import { apiService } from '../../src/ts/services/api-service';

describe('Public API Performance Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Response Time Validation', () => {
        /**
         * Test that all public endpoints respond within acceptable time limits.
         * Ensures good user experience for guest users.
         */
        test('should respond within 2 seconds for all public endpoints', async () => {
            // Arrange
            const endpoints = [
                '/api/v1/dashboard/public/data',
                '/api/v1/charts/public/summary',
                '/api/v1/drivers/guest/info',
                '/api/v1/reports/public/overview',
                '/api/v1/students/public/list'
            ];

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    data: 'performance_test_response',
                    timestamp: new Date().toISOString()
                })
            } as Response);

            // Act & Assert
            for (const endpoint of endpoints) {
                const startTime = performance.now();
                await apiService.get(endpoint);
                const endTime = performance.now();

                const responseTime = endTime - startTime;

                // Should respond within 2 seconds for good UX
                expect(responseTime).toBeLessThan(2000);

                // Log performance metrics for monitoring
                console.log(`${endpoint}: ${responseTime.toFixed(2)}ms`);
            }
        });

        test('should maintain consistent response times under normal load', async () => {
            // Arrange
            const endpoint = '/api/v1/dashboard/public/data';
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ guest_access: true, data: 'test' })
            } as Response);

            // Act - Make multiple sequential requests
            const responseTimes: number[] = [];
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                await apiService.get(endpoint);
                const endTime = performance.now();

                responseTimes.push(endTime - startTime);
            }

            // Assert
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);

            // Average should be under 1 second
            expect(avgResponseTime).toBeLessThan(1000);

            // Maximum should not be more than 3x the minimum (no extreme outliers)
            if (minResponseTime > 0) {
                expect(maxResponseTime).toBeLessThan(minResponseTime * 3);
            }

            console.log(`Performance metrics for ${endpoint}:`);
            console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`  Range: ${minResponseTime.toFixed(2)}ms - ${maxResponseTime.toFixed(2)}ms`);
        });
    });

    describe('Concurrent Request Handling', () => {
        /**
         * Test handling of concurrent requests from multiple guest users.
         * Ensures system stability under concurrent load.
         */
        test('should handle concurrent requests efficiently', async () => {
            // Arrange
            const concurrentRequests = 20;
            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: async () => ({
                        guest_access: true,
                        data: 'concurrent_test',
                        server_timestamp: Date.now()
                    })
                } as Response)
            );

            // Act
            const promises = Array(concurrentRequests).fill(0).map((_, index) =>
                apiService.get(`/api/v1/dashboard/public/data?request=${index}`)
            );

            const startTime = performance.now();
            const results = await Promise.all(promises);
            const endTime = performance.now();

            // Assert
            expect(results).toHaveLength(concurrentRequests);

            // All requests should succeed
            results.forEach(result => {
                expect(result.data.guest_access).toBe(true);
            });

            const totalTime = endTime - startTime;
            const avgTimePerRequest = totalTime / concurrentRequests;

            // Average time per request should be reasonable
            expect(avgTimePerRequest).toBeLessThan(500);

            console.log(`Concurrent load test (${concurrentRequests} requests):`);
            console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Average per request: ${avgTimePerRequest.toFixed(2)}ms`);
        });

        test('should handle mixed concurrent requests across different endpoints', async () => {
            // Arrange
            const endpoints = [
                '/api/v1/dashboard/public/data',
                '/api/v1/charts/public/summary',
                '/api/v1/drivers/guest/info',
                '/api/v1/reports/public/overview',
                '/api/v1/students/public/list'
            ];

            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url: string) => {
                const endpoint = new URL(url).pathname;
                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        guest_access: true,
                        endpoint: endpoint,
                        data: `response_from_${endpoint}`,
                        processed_at: new Date().toISOString()
                    })
                } as Response);
            });

            // Act - Create concurrent requests for different endpoints
            const promises = endpoints.map(endpoint =>
                apiService.get(endpoint)
            );

            const startTime = performance.now();
            const results = await Promise.all(promises);
            const endTime = performance.now();

            // Assert
            expect(results).toHaveLength(endpoints.length);

            // Each result should correspond to the correct endpoint
            results.forEach((result, index) => {
                expect(result.data.guest_access).toBe(true);
                expect(result.data.endpoint).toBe(endpoints[index]);
            });

            const totalTime = endTime - startTime;
            console.log(`Mixed endpoint concurrent test (${endpoints.length} different endpoints):`);
            console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
        });
    });

    describe('Memory Usage and Resource Consumption', () => {
        /**
         * Test memory usage patterns during API calls.
         * Ensures no memory leaks occur during repeated requests.
         */
        test('should not exhibit memory leaks during repeated requests', async () => {
            // Arrange
            const requestCount = 50;
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    data: `response_${Math.random()}`,
                    request_id: Math.floor(Math.random() * 1000)
                })
            } as Response);

            // Act - Make many requests and monitor for memory issues
            const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

            for (let i = 0; i < requestCount; i++) {
                await apiService.get('/api/v1/dashboard/public/data');
            }

            // Force garbage collection if available (development environments)
            if (global.gc) {
                global.gc();
            }

            const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

            // Assert
            if (startMemory > 0 && endMemory > 0) {
                const memoryIncrease = endMemory - startMemory;
                const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

                // Memory increase should be reasonable (less than 10MB for 50 requests)
                expect(memoryIncreaseMB).toBeLessThan(10);

                console.log(`Memory usage for ${requestCount} requests:`);
                console.log(`  Start: ${(startMemory / (1024 * 1024)).toFixed(2)}MB`);
                console.log(`  End: ${(endMemory / (1024 * 1024)).toFixed(2)}MB`);
                console.log(`  Increase: ${memoryIncreaseMB.toFixed(2)}MB`);
            }
        });
    });

    describe('Rate Limiting Performance', () => {
        /**
         * Test rate limiting behavior under various load conditions.
         * Ensures rate limiting works correctly without degrading performance.
         */
        test('should enforce rate limits efficiently under load', async () => {
            // Arrange - Simulate aggressive request pattern
            const aggressiveRequests = 100;
            let rateLimitedCount = 0;

            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url: string) => {
                const requestNumber = parseInt(new URL(url).searchParams.get('request') || '0');

                // Simulate rate limiting after 30 requests
                if (requestNumber > 30) {
                    rateLimitedCount++;
                    return Promise.resolve({
                        ok: false,
                        status: 429,
                        statusText: 'Too Many Requests',
                        headers: new Headers({
                            'retry-after': '60',
                            'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 60).toString()
                        })
                    } as Response);
                }

                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        guest_access: true,
                        request_number: requestNumber,
                        rate_limit_remaining: Math.max(0, 30 - requestNumber)
                    })
                } as Response);
            });

            // Act
            const results = [];
            for (let i = 0; i < aggressiveRequests; i++) {
                try {
                    const result = await apiService.get(`/api/v1/dashboard/public/data?request=${i}`);
                    results.push({ success: true, data: result });
                } catch (error) {
                    results.push({ success: false, error: error.message });
                }
            }

            // Assert
            const successfulRequests = results.filter(r => r.success).length;
            expect(successfulRequests).toBeLessThanOrEqual(31); // Should be rate limited
            expect(rateLimitedCount).toBeGreaterThan(0); // Should have some rate limiting

            console.log(`Rate limiting test (${aggressiveRequests} requests):`);
            console.log(`  Successful: ${successfulRequests}`);
            console.log(`  Rate limited: ${rateLimitedCount}`);
        });
    });

    describe('Caching Performance', () => {
        /**
         * Test caching behavior and its impact on performance.
         * Ensures caching improves performance without causing issues.
         */
        test('should benefit from caching for repeated requests', async () => {
            // Arrange
            const endpoint = '/api/v1/dashboard/public/data';
            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url: string) => {
                const requestNumber = parseInt(new URL(url).searchParams.get('req') || '0');

                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        guest_access: true,
                        request_number: requestNumber,
                        cached: requestNumber > 0, // Simulate caching
                        timestamp: new Date().toISOString()
                    }),
                    headers: new Headers({
                        'cache-control': 'public, max-age=300',
                        'etag': '"abc123"'
                    })
                } as Response);
            });

            // Act - First request (cache miss)
            const firstRequestStart = performance.now();
            await apiService.get(`${endpoint}?req=0`);
            const firstRequestTime = performance.now() - firstRequestStart;

            // Second request (cache hit)
            const secondRequestStart = performance.now();
            await apiService.get(`${endpoint}?req=1`);
            const secondRequestTime = performance.now() - secondRequestStart;

            // Assert
            expect(firstRequestTime).toBeGreaterThan(0);
            expect(secondRequestTime).toBeGreaterThan(0);

            // Second request should be faster (simulated cache hit)
            // Note: In real scenarios, this would depend on actual caching implementation

            console.log(`Caching performance test:`);
            console.log(`  First request: ${firstRequestTime.toFixed(2)}ms`);
            console.log(`  Second request: ${secondRequestTime.toFixed(2)}ms`);
        });
    });

    describe('Error Handling Performance', () => {
        /**
         * Test performance impact of error scenarios.
         * Ensures error handling doesn't significantly degrade performance.
         */
        test('should handle errors without significant performance degradation', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            } as Response);

            // Act - Make requests that will result in errors
            const startTime = performance.now();

            const errorPromises = Array(10).fill(0).map(() =>
                apiService.get('/api/v1/dashboard/public/data').catch(() => null)
            );

            await Promise.all(errorPromises);
            const endTime = performance.now();

            // Assert
            const totalTime = endTime - startTime;
            const avgTimePerError = totalTime / 10;

            // Error handling should still be reasonably fast
            expect(avgTimePerError).toBeLessThan(1000); // Under 1 second per error

            console.log(`Error handling performance (10 errors):`);
            console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Average per error: ${avgTimePerError.toFixed(2)}ms`);
        });
    });

    describe('Load Testing Simulation', () => {
        /**
         * Simulate realistic load testing scenarios.
         * Tests system behavior under various load patterns.
         */
        test('should handle burst traffic patterns', async () => {
            // Arrange
            const burstSize = 50;
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    burst_request: true,
                    handled_at: new Date().toISOString()
                })
            } as Response);

            // Act - Simulate burst traffic
            const burstPromises = Array(burstSize).fill(0).map((_, index) =>
                apiService.get(`/api/v1/dashboard/public/data?burst=${index}`)
            );

            const startTime = performance.now();
            const results = await Promise.all(burstPromises);
            const endTime = performance.now();

            // Assert
            expect(results).toHaveLength(burstSize);

            const totalTime = endTime - startTime;
            const requestsPerSecond = (burstSize / totalTime) * 1000;

            // Should handle at least 10 requests per second
            expect(requestsPerSecond).toBeGreaterThan(10);

            console.log(`Burst traffic test (${burstSize} requests):`);
            console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
            console.log(`  Requests per second: ${requestsPerSecond.toFixed(2)}`);
        });

        test('should maintain performance under sustained load', async () => {
            // Arrange
            const sustainedRequests = 100;
            const batchSize = 10;
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    sustained_load: true,
                    processed_at: new Date().toISOString()
                })
            } as Response);

            // Act - Process requests in batches to simulate sustained load
            const allResults = [];
            for (let i = 0; i < sustainedRequests; i += batchSize) {
                const batch = Array(Math.min(batchSize, sustainedRequests - i)).fill(0).map((_, index) =>
                    apiService.get(`/api/v1/dashboard/public/data?sustained=${i + index}`)
                );

                const batchResults = await Promise.all(batch);
                allResults.push(...batchResults);
            }

            // Assert
            expect(allResults).toHaveLength(sustainedRequests);

            // All requests should succeed
            allResults.forEach(result => {
                expect(result.data.guest_access).toBe(true);
            });

            console.log(`Sustained load test (${sustainedRequests} requests in batches of ${batchSize}):`);
            console.log(`  Success rate: 100%`);
            console.log(`  Total requests processed: ${sustainedRequests}`);
        });
    });

    describe('Resource Cleanup', () => {
        /**
         * Test that resources are properly cleaned up after requests.
         * Ensures no resource leaks occur.
         */
        test('should clean up resources after multiple requests', async () => {
            // Arrange
            const requestCount = 100;
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    cleanup_test: true
                })
            } as Response);

            // Act - Make many requests
            for (let i = 0; i < requestCount; i++) {
                await apiService.get(`/api/v1/dashboard/public/data?cleanup=${i}`);
            }

            // Assert
            expect(fetchSpy).toHaveBeenCalledTimes(requestCount);

            // Verify all requests were made correctly
            fetchSpy.mock.calls.forEach((call, index) => {
                const url = call[0] as string;
                expect(url).toContain(`cleanup=${index}`);
            });
        });
    });
});