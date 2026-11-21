/**
 * Integration tests for frontend services.
 *
 * Tests the integration between API service, auth service, student service,
 * and other service modules to ensure end-to-end functionality.
 */

import { apiService } from '../src/ts/services/api-service';
import { authService } from '../src/ts/services/auth-service';
import { studentService } from '../src/ts/services/student-service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
});

describe('Services Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockClear();
    });

    describe('API Service and Auth Service Integration', () => {
        test('should handle authentication flow end-to-end', async () => {
            // Mock login response
            const mockLoginResponse = {
                access_token: 'mock-jwt-token',
                token_type: 'bearer'
            };

            const mockUserResponse = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'admin'
            };

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockLoginResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockUserResponse)
                });

            // Test login
            const loginResult = await authService.login({
                username_or_email: 'testuser',
                password: 'password123'
            });

            expect(loginResult.data).toEqual(mockUserResponse);
            expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUserResponse));

            // Test authenticated request
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: 'success' })
            });

            const apiResult = await apiService.get('/protected-endpoint');

            expect(mockFetch).toHaveBeenCalledTimes(3); // login + getCurrentUser + protected request
        });

        test('should handle token refresh automatically', async () => {
            // Mock expired token scenario
            mockFetch
                .mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ detail: 'Token expired' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ access_token: 'new-token' })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ data: 'success' })
                });

            // Store expired token
            localStorage.getItem.mockReturnValue(JSON.stringify({
                id: 1,
                username: 'testuser',
                access_token: 'expired-token'
            }));

            // Attempt request that should trigger refresh
            const result = await apiService.get('/test-endpoint');

            expect(result).toEqual({ data: 'success' });
        });

        test('should handle logout and cleanup', async () => {
            // Setup authenticated state
            localStorage.getItem.mockReturnValue(JSON.stringify({
                id: 1,
                username: 'testuser'
            }));

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'Logged out' })
            });

            const logoutResult = await authService.logout();

            expect(logoutResult.error).toBeUndefined();
            expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        });
    });

    describe('Student Service and API Service Integration', () => {
        test('should handle complete student CRUD workflow', async () => {
            const studentData = {
                name: 'Integration Test Student',
                father_name: 'Test Father',
                class: '10',
                mobile: '1234567890',
                route: 'Test Route',
                fees: 1000,
                address: 'Test Address'
            };

            const createdStudent = {
                id: 1,
                ...studentData,
                status: 'active',
                created_at: '2024-01-01T00:00:00Z'
            };

            const updatedStudent = {
                ...createdStudent,
                name: 'Updated Integration Test Student'
            };

            // Mock create
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createdStudent)
            });

            const createResult = await studentService.createStudent(studentData);
            expect(createResult).toEqual(createdStudent);

            // Mock get by ID
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(createdStudent)
            });

            const getResult = await studentService.getStudentById(1);
            expect(getResult).toEqual(createdStudent);

            // Mock update
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(updatedStudent)
            });

            const updateResult = await studentService.updateStudent(1, {
                name: 'Updated Integration Test Student'
            });
            expect(updateResult).toEqual(updatedStudent);

            // Mock search
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([updatedStudent])
            });

            const searchResult = await studentService.searchStudents('Updated');
            expect(searchResult).toEqual([updatedStudent]);

            // Mock delete
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'Deleted successfully' })
            });

            await expect(studentService.deleteStudent(1)).resolves.not.toThrow();

            // Verify API calls
            expect(mockFetch).toHaveBeenCalledTimes(5);
            expect(mockFetch).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/students',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(studentData)
                })
            );
        });

        test('should handle student service errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(studentService.getStudents()).rejects.toThrow('Network error');
        });

        test('should handle pagination in student service', async () => {
            const mockResponse = {
                students: [
                    { id: 1, name: 'Student 1' },
                    { id: 2, name: 'Student 2' }
                ],
                total_count: 50
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await studentService.getStudents(1, 10);

            expect(result).toEqual(mockResponse.students);
            expect(mockFetch).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/students?skip=10&limit=10',
                expect.any(Object)
            );
        });
    });

    describe('Cross-Service Data Consistency', () => {
        test('should maintain data consistency across services', async () => {
            // Create a student via student service
            const studentData = {
                name: 'Consistency Test Student',
                father_name: 'Consistency Father',
                class: '9',
                mobile: '9876543210',
                route: 'Consistency Route',
                fees: 1200,
                address: 'Consistency Address'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    ...studentData,
                    status: 'active'
                })
            });

            const createdStudent = await studentService.createStudent(studentData);

            // Now try to fetch it via API service directly
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 1,
                    ...studentData,
                    status: 'active'
                })
            });

            const directResult = await apiService.get('/students/1');

            expect(directResult).toEqual(createdStudent);
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle network failures with retries', async () => {
            // Mock progressive failures then success
            mockFetch
                .mockRejectedValueOnce(new Error('Network timeout'))
                .mockRejectedValueOnce(new Error('Connection refused'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ data: 'success' })
                });

            // API service should retry failed requests
            const result = await apiService.get('/test-endpoint');

            expect(result).toEqual({ data: 'success' });
            expect(mockFetch).toHaveBeenCalledTimes(3); // 2 failures + 1 success
        });

        test('should handle authentication errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ detail: 'Authentication required' })
            });

            await expect(apiService.get('/protected-endpoint')).rejects.toThrow('HTTP error! status: 401');
        });

        test('should handle malformed JSON responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.reject(new SyntaxError('Unexpected token'))
            });

            await expect(apiService.get('/test-endpoint')).rejects.toThrow('Unexpected token');
        });
    });

    describe('Service State Management', () => {
        test('should manage authentication state correctly', async () => {
            // Test initial unauthenticated state
            expect(await authService.isAuthenticated()).toBe(false);

            // Mock successful login
            const mockUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                role: 'admin'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    access_token: 'test-token',
                    token_type: 'bearer'
                })
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockUser)
            });

            await authService.login({
                username_or_email: 'testuser',
                password: 'password123'
            });

            // Should now be authenticated
            expect(await authService.isAuthenticated()).toBe(true);
            expect(authService.getStoredUser()).toEqual(mockUser);

            // Test logout
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ message: 'Logged out successfully' })
            });

            await authService.logout();

            expect(await authService.isAuthenticated()).toBe(false);
            expect(authService.getStoredUser()).toBeNull();
        });

        test('should handle concurrent requests', async () => {
            const mockResponse = { data: 'concurrent-test' };

            // Mock multiple simultaneous responses
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockResponse)
                });

            // Make concurrent requests
            const promises = [
                apiService.get('/endpoint1'),
                apiService.get('/endpoint2'),
                apiService.get('/endpoint3')
            ];

            const results = await Promise.all(promises);

            expect(results).toEqual([mockResponse, mockResponse, mockResponse]);
        });
    });
});