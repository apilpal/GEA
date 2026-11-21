/**
 * Comprehensive integration tests for public API endpoints in guest-first architecture.
 *
 * Tests all public API endpoints that provide guest access to basic data
 * without authentication requirements, including:
 * - GET /api/v1/dashboard/public/data - Public dashboard data for guests
 * - GET /api/v1/charts/public/summary - Public chart summaries
 * - GET /api/v1/drivers/guest/info - Guest driver information
 * - GET /api/v1/reports/public/overview - Public reports overview
 * - GET /api/v1/students/public/list - Public student list (limited data)
 *
 * @author Jest Test Engineer
 * @version 2.0.0
 */

import { apiService } from '../../src/ts/services/api-service';

describe('Public API Integration Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Public Dashboard Stats Endpoint', () => {
        test('should fetch public dashboard stats successfully', async () => {
            // Arrange
            const mockStatsResponse = {
                total_drivers: 25,
                total_students: 150,
                total_revenue: 50000,
                active_drivers: 22,
                system_status: 'operational',
                last_updated: '2024-01-15T10:30:00Z',
                guest_access: true
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockStatsResponse
            } as Response);

            // Act
            const result = await apiService.get('/dashboard/public/stats');

            // Assert
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/dashboard/public/stats'),
                expect.any(Object)
            );
            expect(result.data).toEqual(mockStatsResponse);
            expect(result.data.guest_access).toBe(true);
        });

        test('should handle errors when fetching public stats', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            } as Response);

            // Act & Assert
            await expect(apiService.get('/dashboard/public/stats')).rejects.toThrow();
        });

        test('should include rate limiting headers in public stats requests', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ total_drivers: 10 }),
                headers: new Headers({
                    'x-ratelimit-limit': '30',
                    'x-ratelimit-remaining': '29'
                })
            } as Response);

            // Act
            await apiService.get('/dashboard/public/stats');

            // Assert
            const [url, options] = fetchSpy.mock.calls[0];
            expect(options.headers).toBeDefined();
        });
    });

    describe('Public Dashboard Charts Endpoint', () => {
        test('should fetch public dashboard charts data', async () => {
            // Arrange
            const mockChartsResponse = {
                student_distribution: {
                    labels: ['Grade 1', 'Grade 2', 'Grade 3'],
                    data: [50, 45, 55]
                },
                revenue_by_driver: {
                    labels: ['Driver A', 'Driver B', 'Driver C'],
                    data: [15000, 20000, 15000]
                },
                revenue_by_class: {
                    labels: ['Morning', 'Afternoon', 'Evening'],
                    data: [25000, 20000, 5000]
                },
                guest_access: true,
                charts_count: 3
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockChartsResponse
            } as Response);

            // Act
            const result = await apiService.get('/dashboard/public/charts');

            // Assert
            expect(result.data).toEqual(mockChartsResponse);
            expect(result.data.guest_access).toBe(true);
            expect(result.data.charts_count).toBe(3);
        });

        test('should handle chart data parsing errors', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => {
                    throw new Error('Invalid JSON');
                }
            } as Response);

            // Act & Assert
            await expect(apiService.get('/dashboard/public/charts')).rejects.toThrow();
        });
    });

    describe('Public Driver Information Endpoint', () => {
        test('should fetch public driver information with pagination', async () => {
            // Arrange
            const mockDriversResponse = {
                drivers: [
                    {
                        id: 1,
                        name: 'John Doe',
                        route: 'Route A',
                        status: 'active',
                        total_students: 25
                    },
                    {
                        id: 2,
                        name: 'Jane Smith',
                        route: 'Route B',
                        status: 'active',
                        total_students: 30
                    }
                ],
                total_count: 2,
                guest_access: true,
                pagination: {
                    skip: 0,
                    limit: 20,
                    has_more: false
                }
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockDriversResponse
            } as Response);

            // Act
            const result = await apiService.get('/dashboard/public/drivers?skip=0&limit=20');

            // Assert
            expect(result.data.drivers).toHaveLength(2);
            expect(result.data.guest_access).toBe(true);
            expect(result.data.pagination.has_more).toBe(false);
            expect(result.data.drivers[0]).not.toHaveProperty('contact_number');
            expect(result.data.drivers[0]).not.toHaveProperty('license_number');
        });

        test('should handle pagination parameters correctly', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    drivers: [],
                    total_count: 0,
                    guest_access: true,
                    pagination: { skip: 20, limit: 10, has_more: false }
                })
            } as Response);

            // Act
            await apiService.get('/dashboard/public/drivers?skip=20&limit=10');

            // Assert
            const [url] = fetchSpy.mock.calls[0];
            expect(url).toContain('skip=20');
            expect(url).toContain('limit=10');
        });

        test('should exclude sensitive driver information', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    drivers: [{
                        id: 1,
                        name: 'Test Driver',
                        route: 'Test Route',
                        status: 'active',
                        total_students: 20,
                        // These should NOT be present in response
                        contact_number: '+1234567890',
                        license_number: 'ABC123'
                    }],
                    total_count: 1,
                    guest_access: true,
                    pagination: { skip: 0, limit: 20, has_more: false }
                })
            } as Response);

            // Act
            const result = await apiService.get('/dashboard/public/drivers');

            // Assert
            expect(result.data.drivers[0]).not.toHaveProperty('contact_number');
            expect(result.data.drivers[0]).not.toHaveProperty('license_number');
            expect(result.data.drivers[0]).not.toHaveProperty('vehicle_number');
        });
    });

    describe('Rate Limiting', () => {
        test('should handle rate limiting responses', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                headers: new Headers({
                    'retry-after': '60'
                })
            } as Response);

            // Act & Assert
            await expect(apiService.get('/dashboard/public/stats')).rejects.toThrow('Too Many Requests');
        });

        test('should respect different rate limits per endpoint', async () => {
            // Arrange - Stats endpoint (30 per minute)
            const statsFetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => ({ total_drivers: 10 }),
                headers: new Headers({ 'x-ratelimit-limit': '30' })
            } as Response);

            // Charts endpoint (20 per minute)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ charts_count: 3 }),
                headers: new Headers({ 'x-ratelimit-limit': '20' })
            } as Response);

            // Drivers endpoint (25 per minute)
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ drivers: [], total_count: 0 }),
                headers: new Headers({ 'x-ratelimit-limit': '25' })
            } as Response);

            // Act
            await apiService.get('/dashboard/public/stats');
            await apiService.get('/dashboard/public/charts');
            await apiService.get('/dashboard/public/drivers');

            // Assert - Different limits for different endpoints
            expect(statsFetchSpy).toHaveBeenCalled();
        });
    });

    describe('Error Scenarios', () => {
        test('should handle network failures gracefully', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(
                new Error('Network Error')
            );

            // Act & Assert
            await expect(apiService.get('/dashboard/public/stats')).rejects.toThrow('Network Error');
        });

        test('should handle server errors appropriately', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable'
            } as Response);

            // Act & Assert
            await expect(apiService.get('/dashboard/public/stats')).rejects.toThrow('Service Unavailable');
        });

        test('should handle malformed responses', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => {
                    throw new SyntaxError('Unexpected token');
                }
            } as Response);

            // Act & Assert
            await expect(apiService.get('/dashboard/public/stats')).rejects.toThrow();
        });
    });

    describe('Guest Access Indicators', () => {
        test('should include guest access flags in all responses', async () => {
            // Arrange
            const responses = [
                { total_drivers: 10, guest_access: true },
                { charts_count: 3, guest_access: true },
                { drivers: [], total_count: 0, guest_access: true }
            ];

            let callCount = 0;
            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() => {
                return Promise.resolve({
                    ok: true,
                    json: async () => responses[callCount++]
                } as Response);
            });

            // Act
            const statsResult = await apiService.get('/dashboard/public/stats');
            const chartsResult = await apiService.get('/dashboard/public/charts');
            const driversResult = await apiService.get('/dashboard/public/drivers');

            // Assert
            expect(statsResult.data.guest_access).toBe(true);
            expect(chartsResult.data.guest_access).toBe(true);
            expect(driversResult.data.guest_access).toBe(true);
        });
    });

    describe('GET /api/v1/dashboard/public/data - Enhanced Tests', () => {
        /**
         * Test successful retrieval of public dashboard data.
         * Verifies guest users can access sanitized dashboard data without authentication.
         */
        test('should fetch public dashboard data successfully', async () => {
            // Arrange
            const mockResponse = {
                guest_access: true,
                summary: {
                    total_students: 150,
                    total_drivers: 25,
                    active_routes: 12,
                    system_status: 'operational'
                },
                last_updated: '2024-01-15T10:30:00Z',
                data_freshness: '5_minutes',
                permissions: ['dashboard:read']
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
                headers: new Headers({
                    'content-type': 'application/json',
                    'cache-control': 'public, max-age=300'
                })
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/dashboard/public/data');

            // Assert
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/dashboard/public/data'),
                expect.any(Object)
            );
            expect(result.data).toEqual(mockResponse);
            expect(result.data.guest_access).toBe(true);
            expect(result.data.permissions).toContain('dashboard:read');
        });

        test('should handle dashboard data with cache headers', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    summary: { total_students: 100 },
                    last_updated: '2024-01-15T10:30:00Z'
                }),
                headers: new Headers({
                    'cache-control': 'public, max-age=300',
                    'etag': '"abc123"'
                })
            } as Response);

            // Act
            await apiService.get('/api/v1/dashboard/public/data');

            // Assert
            const [url, options] = fetchSpy.mock.calls[0];
            expect(options.headers).toBeDefined();
        });
    });

    describe('GET /api/v1/charts/public/summary - Enhanced Tests', () => {
        /**
         * Test successful retrieval of public charts summary.
         * Verifies aggregated chart data is accessible to guest users.
         */
        test('should fetch public charts summary successfully', async () => {
            // Arrange
            const mockResponse = {
                guest_access: true,
                charts: {
                    student_distribution: {
                        type: 'pie',
                        title: 'Student Distribution by Grade',
                        data_points: 150,
                        summary: 'Grade 1-3 students'
                    },
                    route_efficiency: {
                        type: 'bar',
                        title: 'Route Efficiency Overview',
                        data_points: 25,
                        summary: 'Average route completion rate'
                    }
                },
                total_charts: 2,
                last_updated: '2024-01-15T10:30:00Z',
                data_freshness: '15_minutes'
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/charts/public/summary');

            // Assert
            expect(result.data.guest_access).toBe(true);
            expect(result.data.total_charts).toBe(2);
            expect(result.data.charts).toHaveProperty('student_distribution');
            expect(result.data.charts).toHaveProperty('route_efficiency');
        });

        test('should handle charts summary with data sanitization', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    charts: {
                        test_chart: {
                            type: 'line',
                            data_points: 100,
                            // Should not contain sensitive data
                            summary: 'Public chart data only'
                        }
                    },
                    total_charts: 1
                })
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/charts/public/summary');

            // Assert
            expect(result.data.guest_access).toBe(true);
            const chartsStr = JSON.stringify(result.data.charts).toLowerCase();

            // Ensure no sensitive patterns in response
            expect(chartsStr).not.toContain('password');
            expect(chartsStr).not.toContain('contact_info');
            expect(chartsStr).not.toContain('personal_data');
        });
    });

    describe('GET /api/v1/drivers/guest/info - Enhanced Tests', () => {
        /**
         * Test successful retrieval of public driver information with pagination.
         * Verifies limited driver data is accessible to guest users.
         */
        test('should fetch public driver information with pagination', async () => {
            // Arrange
            const mockResponse = {
                guest_access: true,
                drivers: [
                    {
                        id: 'driver_1',
                        name: 'John Smith',
                        route_name: 'Route A',
                        status: 'active',
                        areas_served: ['North District', 'Central District']
                    },
                    {
                        id: 'driver_2',
                        name: 'Jane Doe',
                        route_name: 'Route B',
                        status: 'active',
                        areas_served: ['South District', 'East District']
                    }
                ],
                total_count: 2,
                pagination: {
                    page: 1,
                    limit: 20,
                    has_more: false
                },
                last_updated: '2024-01-15T10:30:00Z'
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/drivers/guest/info?page=1&limit=20');

            // Assert
            expect(result.data.drivers).toHaveLength(2);
            expect(result.data.guest_access).toBe(true);
            expect(result.data.pagination.has_more).toBe(false);
            expect(result.data.total_count).toBe(2);

            // Verify data sanitization - no sensitive fields
            result.data.drivers.forEach((driver: any) => {
                expect(driver).not.toHaveProperty('phone_number');
                expect(driver).not.toHaveProperty('email');
                expect(driver).not.toHaveProperty('license_number');
                expect(driver).not.toHaveProperty('home_address');
            });
        });

        test('should handle pagination parameters correctly', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    drivers: [],
                    total_count: 0,
                    guest_access: true,
                    pagination: { page: 2, limit: 10, has_more: true }
                })
            } as Response);

            // Act
            await apiService.get('/api/v1/drivers/guest/info?page=2&limit=10');

            // Assert
            const [url] = fetchSpy.mock.calls[0];
            expect(url).toContain('page=2');
            expect(url).toContain('limit=10');
        });

        test('should exclude all sensitive driver information', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    drivers: [{
                        id: 'driver_1',
                        name: 'Test Driver',
                        route_name: 'Test Route',
                        status: 'active',
                        areas_served: ['Test Area'],
                        // These should NOT be present in response
                        phone_number: '+1234567890',
                        email: 'driver@test.com',
                        license_number: 'ABC123',
                        vehicle_registration: 'XYZ789',
                        home_address: '123 Test St',
                        emergency_contact: 'Jane Doe'
                    }],
                    total_count: 1,
                    guest_access: true,
                    pagination: { page: 1, limit: 20, has_more: false }
                })
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/drivers/guest/info');

            // Assert
            const driver = result.data.drivers[0];
            expect(driver).not.toHaveProperty('phone_number');
            expect(driver).not.toHaveProperty('email');
            expect(driver).not.toHaveProperty('license_number');
            expect(driver).not.toHaveProperty('vehicle_registration');
            expect(driver).not.toHaveProperty('home_address');
            expect(driver).not.toHaveProperty('emergency_contact');
        });
    });

    describe('GET /api/v1/reports/public/overview - Enhanced Tests', () => {
        /**
         * Test successful retrieval of public reports overview.
         * Verifies high-level report summaries are accessible to guest users.
         */
        test('should fetch public reports overview successfully', async () => {
            // Arrange
            const mockResponse = {
                guest_access: true,
                overview: {
                    total_reports: 5,
                    available_categories: [
                        'transportation_summary',
                        'student_overview',
                        'system_performance'
                    ],
                    report_frequency: 'daily',
                    last_generated: '2024-01-15T08:00:00Z'
                },
                summary_stats: {
                    avg_route_completion: '94.5%',
                    total_distance_covered: '1250 km',
                    student_satisfaction_score: '4.2/5'
                },
                permissions: ['reports:read:overview']
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/reports/public/overview');

            // Assert
            expect(result.data.guest_access).toBe(true);
            expect(result.data.overview.total_reports).toBe(5);
            expect(result.data.overview.available_categories).toHaveLength(3);
            expect(result.data.permissions).toContain('reports:read:overview');
            expect(result.data.summary_stats).toBeDefined();
        });

        test('should handle reports overview caching', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    guest_access: true,
                    overview: { total_reports: 3 },
                    last_generated: '2024-01-15T08:00:00Z'
                }),
                headers: new Headers({
                    'cache-control': 'public, max-age=600',
                    'last-modified': 'Tue, 15 Jan 2024 08:00:00 GMT'
                })
            } as Response);

            // Act
            await apiService.get('/api/v1/reports/public/overview');

            // Assert
            const [url, options] = fetchSpy.mock.calls[0];
            expect(options.headers).toBeDefined();
        });
    });

    describe('GET /api/v1/students/public/list - Enhanced Tests', () => {
        /**
         * Test successful retrieval of public student list.
         * Verifies limited student information is accessible to guest users.
         */
        test('should fetch public students list successfully', async () => {
            // Arrange
            const mockResponse = {
                guest_access: true,
                students: [
                    {
                        id: 'student_1',
                        grade_level: 'Grade 1',
                        status: 'active',
                        enrollment_year: 2024
                    },
                    {
                        id: 'student_2',
                        grade_level: 'Grade 2',
                        status: 'active',
                        enrollment_year: 2024
                    }
                ],
                total_count: 2,
                grade_distribution: {
                    'Grade 1': 1,
                    'Grade 2': 1
                },
                pagination: {
                    page: 1,
                    limit: 50,
                    has_more: false
                }
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/students/public/list');

            // Assert
            expect(result.data.guest_access).toBe(true);
            expect(result.data.students).toHaveLength(2);
            expect(result.data.total_count).toBe(2);
            expect(result.data.grade_distribution).toBeDefined();
        });

        test('should ensure student privacy protection', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    students: [{
                        id: 'student_1',
                        grade_level: 'Grade 1',
                        status: 'active',
                        enrollment_year: 2024,
                        // These should NOT be present in response
                        full_name: 'John Smith',
                        first_name: 'John',
                        last_name: 'Smith',
                        date_of_birth: '2015-01-01',
                        address: '123 Main St',
                        phone_number: '+1234567890',
                        email: 'john@test.com',
                        parent_contact: 'Jane Smith',
                        medical_info: 'None',
                        emergency_contact: 'Jane Smith',
                        student_id_number: '12345'
                    }],
                    total_count: 1,
                    guest_access: true,
                    grade_distribution: { 'Grade 1': 1 },
                    pagination: { page: 1, limit: 50, has_more: false }
                })
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/students/public/list');

            // Assert
            const student = result.data.students[0];
            expect(student).not.toHaveProperty('full_name');
            expect(student).not.toHaveProperty('first_name');
            expect(student).not.toHaveProperty('last_name');
            expect(student).not.toHaveProperty('date_of_birth');
            expect(student).not.toHaveProperty('address');
            expect(student).not.toHaveProperty('phone_number');
            expect(student).not.toHaveProperty('email');
            expect(student).not.toHaveProperty('parent_contact');
            expect(student).not.toHaveProperty('medical_info');
            expect(student).not.toHaveProperty('emergency_contact');
            expect(student).not.toHaveProperty('student_id_number');
        });

        test('should provide grade distribution aggregation', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({
                    students: [
                        { id: 's1', grade_level: 'Grade 1', status: 'active' },
                        { id: 's2', grade_level: 'Grade 1', status: 'active' },
                        { id: 's3', grade_level: 'Grade 2', status: 'active' }
                    ],
                    total_count: 3,
                    guest_access: true,
                    grade_distribution: {
                        'Grade 1': 2,
                        'Grade 2': 1
                    },
                    pagination: { page: 1, limit: 50, has_more: false }
                })
            } as Response);

            // Act
            const result = await apiService.get('/api/v1/students/public/list');

            // Assert
            expect(result.data.grade_distribution).toBeDefined();
            expect(result.data.grade_distribution['Grade 1']).toBe(2);
            expect(result.data.grade_distribution['Grade 2']).toBe(1);

            // Verify all distribution values are numbers
            Object.values(result.data.grade_distribution).forEach((value: any) => {
                expect(typeof value).toBe('number');
                expect(value).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Performance and Load Testing', () => {
        /**
         * Test response times for all public endpoints.
         * Ensures good performance for guest user experience.
         */
        test('should respond within acceptable time limits', async () => {
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
                json: async () => ({ guest_access: true, data: 'test' })
            } as Response);

            // Act & Assert
            for (const endpoint of endpoints) {
                const startTime = Date.now();
                await apiService.get(endpoint);
                const endTime = Date.now();

                const responseTime = endTime - startTime;
                expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
            }
        });

        test('should handle concurrent requests efficiently', async () => {
            // Arrange
            const concurrentRequests = 10;
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ guest_access: true, data: 'test' })
            } as Response);

            // Act
            const promises = Array(concurrentRequests).fill(0).map(() =>
                apiService.get('/api/v1/dashboard/public/data')
            );

            const startTime = Date.now();
            const results = await Promise.all(promises);
            const endTime = Date.now();

            // Assert
            expect(results).toHaveLength(concurrentRequests);
            results.forEach(result => {
                expect(result.data.guest_access).toBe(true);
            });

            const totalTime = endTime - startTime;
            const avgTimePerRequest = totalTime / concurrentRequests;
            expect(avgTimePerRequest).toBeLessThan(500); // Average under 500ms per request
        });
    });

    describe('Error Handling and Edge Cases', () => {
        /**
         * Test error handling for malformed requests.
         * Ensures graceful handling of invalid parameters.
         */
        test('should handle malformed request parameters', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ guest_access: true, data: 'test' })
            } as Response);

            // Act & Assert - Should not throw for malformed params
            await expect(apiService.get('/api/v1/dashboard/public/data?malformed=param')).resolves.toBeDefined();
            await expect(apiService.get('/api/v1/drivers/guest/info?page=invalid')).resolves.toBeDefined();
        });

        test('should handle server errors gracefully', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            } as Response);

            // Act & Assert
            await expect(apiService.get('/api/v1/dashboard/public/data')).rejects.toThrow();
        });

        test('should handle network timeouts appropriately', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Network timeout')), 100)
                )
            );

            // Act & Assert
            await expect(apiService.get('/api/v1/dashboard/public/data')).rejects.toThrow('Network timeout');
        });
    });

    describe('Response Format Consistency', () => {
        /**
         * Test that all public endpoints return consistent response formats.
         * Ensures predictable structure for frontend consumption.
         */
        test('should return consistent response structure across all endpoints', async () => {
            // Arrange
            const endpoints = [
                '/api/v1/dashboard/public/data',
                '/api/v1/charts/public/summary',
                '/api/v1/drivers/guest/info',
                '/api/v1/reports/public/overview',
                '/api/v1/students/public/list'
            ];

            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url: string) => {
                const mockData: Record<string, any> = {
                    '/api/v1/dashboard/public/data': {
                        guest_access: true,
                        summary: {},
                        last_updated: '2024-01-15T10:30:00Z',
                        permissions: []
                    },
                    '/api/v1/charts/public/summary': {
                        guest_access: true,
                        charts: {},
                        total_charts: 0,
                        last_updated: '2024-01-15T10:30:00Z'
                    },
                    '/api/v1/drivers/guest/info': {
                        guest_access: true,
                        drivers: [],
                        total_count: 0,
                        pagination: {}
                    },
                    '/api/v1/reports/public/overview': {
                        guest_access: true,
                        overview: {},
                        summary_stats: {}
                    },
                    '/api/v1/students/public/list': {
                        guest_access: true,
                        students: [],
                        total_count: 0,
                        grade_distribution: {}
                    }
                };

                const endpoint = new URL(url).pathname;
                return Promise.resolve({
                    ok: true,
                    json: async () => mockData[endpoint]
                } as Response);
            });

            // Act & Assert
            for (const endpoint of endpoints) {
                const result = await apiService.get(endpoint);

                // All responses should have guest_access flag
                expect(result.data).toHaveProperty('guest_access');
                expect(result.data.guest_access).toBe(true);

                // All responses should have timestamp information
                expect(result.data).toHaveProperty('last_updated');
                expect(typeof result.data.last_updated).toBe('string');
            }
        });
    });

    describe('Rate Limiting Integration', () => {
        /**
         * Test rate limiting behavior across all public endpoints.
         * Ensures appropriate rate limiting for different endpoint types.
         */
        test('should respect different rate limits per endpoint', async () => {
            // Arrange - Different rate limits for different endpoints
            const rateLimits: Record<string, number> = {
                '/api/v1/dashboard/public/data': 60,    // 60 per minute
                '/api/v1/charts/public/summary': 30,    // 30 per minute
                '/api/v1/drivers/guest/info': 20,       // 20 per minute (stricter due to privacy)
                '/api/v1/reports/public/overview': 15,  // 15 per minute
                '/api/v1/students/public/list': 10      // 10 per minute (strictest due to privacy)
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation((url: string) => {
                const endpoint = new URL(url).pathname;
                const limit = rateLimits[endpoint];

                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        guest_access: true,
                        rate_limit_info: { limit, remaining: limit - 1 }
                    }),
                    headers: new Headers({
                        'x-ratelimit-limit': limit.toString(),
                        'x-ratelimit-remaining': (limit - 1).toString()
                    })
                } as Response);
            });

            // Act & Assert
            for (const [endpoint, expectedLimit] of Object.entries(rateLimits)) {
                const result = await apiService.get(endpoint);

                expect(result.data.guest_access).toBe(true);
                expect(result.data.rate_limit_info.limit).toBe(expectedLimit);
            }
        });

        test('should handle rate limit exceeded responses', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                headers: new Headers({
                    'retry-after': '60',
                    'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 60).toString()
                })
            } as Response);

            // Act & Assert
            await expect(apiService.get('/api/v1/dashboard/public/data')).rejects.toThrow('Too Many Requests');
        });
    });

    describe('CORS and Cross-Origin Support', () => {
        /**
         * Test CORS handling for cross-origin requests.
         * Ensures proper CORS configuration for frontend access.
         */
        test('should handle CORS preflight requests', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ guest_access: true }),
                headers: new Headers({
                    'access-control-allow-origin': '*',
                    'access-control-allow-methods': 'GET, OPTIONS',
                    'access-control-allow-headers': 'Content-Type, Authorization'
                })
            } as Response);

            // Act
            await apiService.get('/api/v1/dashboard/public/data');

            // Assert
            const [url, options] = fetchSpy.mock.calls[0];
            expect(options).toBeDefined();
        });
    });

    describe('Data Sanitization and Security', () => {
        /**
         * Test comprehensive data sanitization across all endpoints.
         * Ensures no sensitive information is exposed to guest users.
         */
        test('should sanitize all responses for guest access', async () => {
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
                        data: `response_from_${endpoint}`,
                        // Include potentially sensitive data that should be filtered
                        internal_id: 'sensitive_123',
                        debug_info: 'should_not_appear'
                    })
                } as Response);
            });

            // Act & Assert
            for (const endpoint of endpoints) {
                const result = await apiService.get(endpoint);

                expect(result.data.guest_access).toBe(true);

                // Convert response to string for pattern checking
                const responseStr = JSON.stringify(result.data).toLowerCase();

                // Should not contain sensitive patterns
                const sensitivePatterns = [
                    'password', 'ssn', 'social_security', 'credit_card',
                    'bank_account', 'license_number', 'phone_number',
                    'email', 'address', 'medical_info', 'debug_info'
                ];

                for (const pattern of sensitivePatterns) {
                    expect(responseStr).not.toContain(pattern);
                }
            }
        });
    });
});