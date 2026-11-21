/**
 * Comprehensive test suite for page managers.
 *
 * Tests the page manager modules that handle data loading and UI updates
 * for different pages in the application.
 */

import { apiService } from '../src/ts/services/api-service';
import {
    loadStudentsForStudentsPage,
    updateDashboardStats,
    generateAllReports,
    loadDriversForTransportPage,
    loadDriverStudents,
    loadAllDriversTable,
    refreshDrivers
} from '../src/ts/page-managers/index';

// Mock the API service
jest.mock('../src/ts/services/api-service');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock DOM elements
const mockStudentTable = {
    setStudents: jest.fn()
};

const mockDashboardStats = {
    textContent: ''
};

const mockReportElements = {
    summary: { textContent: '' },
    driverStats: { innerHTML: '' },
    revenueAnalysis: { innerHTML: '' }
};

// Setup DOM mocks before each test
beforeEach(() => {
    // Mock document.querySelector
    document.querySelector = jest.fn((selector: string) => {
        if (selector === 'student-table') {
            return mockStudentTable as any;
        }
        if (selector === '.stat-card:nth-child(1) .stat-value') {
            return mockDashboardStats as any;
        }
        if (selector === '#reports-summary') {
            return mockReportElements.summary as any;
        }
        if (selector === '#driver-student-stats') {
            return mockReportElements.driverStats as any;
        }
        if (selector === '#revenue-analysis') {
            return mockReportElements.revenueAnalysis as any;
        }
        return null;
    });

    // Mock document.querySelectorAll for multiple elements
    document.querySelectorAll = jest.fn((selector: string) => {
        if (selector === '.driver-card') {
            return [];
        }
        return [];
    });

    // Reset all mocks
    jest.clearAllMocks();
});

describe('Page Managers', () => {
    describe('Students Manager', () => {
        test('should load students successfully', async () => {
            const mockStudents = [
                { id: 1, name: 'John Doe', class: '10' },
                { id: 2, name: 'Jane Smith', class: '9' }
            ];

            mockApiService.get.mockResolvedValueOnce({
                data: { students: mockStudents },
                students: mockStudents
            });

            await loadStudentsForStudentsPage();

            expect(mockApiService.get).toHaveBeenCalledWith('/students/');
            expect(mockStudentTable.setStudents).toHaveBeenCalledWith(mockStudents);
        });

        test('should handle API error gracefully', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            mockApiService.get.mockRejectedValueOnce(new Error('API Error'));

            await loadStudentsForStudentsPage();

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load students:', expect.any(Error));
            expect(mockStudentTable.setStudents).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('should handle missing student table element', async () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            const mockStudents = [{ id: 1, name: 'John Doe' }];
            mockApiService.get.mockResolvedValueOnce({
                data: { students: mockStudents }
            });

            await loadStudentsForStudentsPage();

            expect(mockApiService.get).toHaveBeenCalledWith('/students/');
            // Should not throw error when element is missing
        });
    });

    describe('Dashboard Manager', () => {
        test('should update dashboard stats successfully', async () => {
            const mockStats = {
                total_students: 150,
                total_drivers: 12,
                total_revenue: 45000.0
            };

            mockApiService.get.mockResolvedValueOnce(mockStats);

            await updateDashboardStats();

            expect(mockApiService.get).toHaveBeenCalledWith('/reports/summary');
            expect(mockDashboardStats.textContent).toBe('150'); // Should update student count
        });

        test('should handle dashboard API error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            mockApiService.get.mockRejectedValueOnce(new Error('Dashboard API Error'));

            await updateDashboardStats();

            expect(consoleSpy).toHaveBeenCalledWith('Error updating dashboard stats:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('Reports Manager', () => {
        test('should generate all reports successfully', async () => {
            const mockSummary = {
                total_students: 150,
                total_drivers: 12,
                total_revenue: 45000.0,
                drivers: [
                    { name: 'Driver A', student_count: 25 },
                    { name: 'Driver B', student_count: 30 }
                ]
            };

            const mockStudentsByDriver = {
                'Route A': [
                    { name: 'Student 1', class: '10' },
                    { name: 'Student 2', class: '9' }
                ]
            };

            const mockRevenueAnalysis = {
                by_driver: { 'Route A': 15000.0, 'Route B': 51730.0 },
                by_class: { '10': 25000.0, '9': 20000.0 },
                total_revenue: 45000.0
            };

            const mockDriverStats = {
                total_drivers: 12,
                total_students: 150,
                average_students_per_driver: 12.5,
                driver_statistics: [
                    { driver_name: 'Driver A', student_count: 25, total_fees: 15000.0 }
                ]
            };

            mockApiService.get
                .mockResolvedValueOnce(mockSummary)
                .mockResolvedValueOnce(mockStudentsByDriver)
                .mockResolvedValueOnce(mockRevenueAnalysis)
                .mockResolvedValueOnce(mockDriverStats);

            await generateAllReports();

            expect(mockApiService.get).toHaveBeenCalledWith('/reports/summary');
            expect(mockApiService.get).toHaveBeenCalledWith('/reports/students-by-driver');
            expect(mockApiService.get).toHaveBeenCalledWith('/reports/revenue-analysis');
            expect(mockApiService.get).toHaveBeenCalledWith('/reports/driver-student-stats');
        });

        test('should handle partial report failures', async () => {
            const mockSummary = { total_students: 100 };
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            mockApiService.get
                .mockResolvedValueOnce(mockSummary)
                .mockRejectedValueOnce(new Error('Students by driver failed'))
                .mockResolvedValueOnce({ total_revenue: 51730.0 })
                .mockResolvedValueOnce({ total_drivers: 10 });

            await generateAllReports();

            expect(consoleSpy).toHaveBeenCalledWith('Error loading students by driver:', expect.any(Error));
            // Other reports should still be processed
            expect(mockReportElements.summary.textContent).toContain('100');

            consoleSpy.mockRestore();
        });
    });

    describe('Transport Manager', () => {
        test('should load drivers for transport page', async () => {
            const mockDrivers = [
                { id: 1, name: 'Driver A', route: 'Route A', total_students: 25 },
                { id: 2, name: 'Driver B', route: 'Route B', total_students: 30 }
            ];

            mockApiService.get.mockResolvedValueOnce({
                drivers: mockDrivers,
                total_count: 2
            });

            await loadDriversForTransportPage();

            expect(mockApiService.get).toHaveBeenCalledWith('/drivers');
        });

        test('should load driver students', async () => {
            const mockStudents = [
                { id: 1, name: 'Student 1', class: '10', father_name: 'Father 1' },
                { id: 2, name: 'Student 2', class: '9', father_name: 'Father 2' }
            ];

            mockApiService.get.mockResolvedValueOnce(mockStudents);

            await loadDriverStudents('Driver A');

            expect(mockApiService.get).toHaveBeenCalledWith('/students/search/?q=Driver A');
        });

        test('should load all drivers table', async () => {
            const mockDrivers = [
                { id: 1, name: 'Driver A', route: 'Route A' },
                { id: 2, name: 'Driver B', route: 'Route B' }
            ];

            mockApiService.get.mockResolvedValueOnce({
                drivers: mockDrivers,
                total_count: 2
            });

            await loadAllDriversTable();

            expect(mockApiService.get).toHaveBeenCalledWith('/drivers');
        });

        test('should refresh drivers', async () => {
            const mockDrivers = [
                { id: 1, name: 'Driver A', route: 'Route A' }
            ];

            mockApiService.get.mockResolvedValueOnce({
                drivers: mockDrivers,
                total_count: 1
            });

            await refreshDrivers();

            expect(mockApiService.get).toHaveBeenCalledWith('/drivers');
        });

        test('should handle transport page errors', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            mockApiService.get.mockRejectedValueOnce(new Error('Transport API Error'));

            await loadDriversForTransportPage();

            expect(consoleSpy).toHaveBeenCalledWith('Error loading drivers:', expect.any(Error));

            consoleSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            mockApiService.get.mockRejectedValueOnce(new Error('Network Error'));

            await expect(loadStudentsForStudentsPage()).resolves.not.toThrow();
            await expect(updateDashboardStats()).resolves.not.toThrow();
            await expect(generateAllReports()).resolves.not.toThrow();
        });

        test('should handle malformed API responses', async () => {
            mockApiService.get.mockResolvedValueOnce(null);

            await expect(loadStudentsForStudentsPage()).resolves.not.toThrow();
            await expect(updateDashboardStats()).resolves.not.toThrow();
        });

        test('should handle missing DOM elements', async () => {
            document.querySelector = jest.fn().mockReturnValue(null);

            const mockStudents = [{ id: 1, name: 'Test' }];
            mockApiService.get.mockResolvedValueOnce({
                data: { students: mockStudents }
            });

            await expect(loadStudentsForStudentsPage()).resolves.not.toThrow();
        });
    });
});