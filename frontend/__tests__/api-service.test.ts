// Unit tests for API service
import { apiService } from '../src/ts/services/api-service';

/**
 * Comprehensive test suite for the API service functionality.
 * Tests all HTTP methods, error handling, configuration, and edge cases.
 */
describe('API Service', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        // Reset fetch mock
        (global.fetch as jest.Mock).mockClear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Restore original fetch
        global.fetch = originalFetch;
    });

    /**
     * Test suite for GET request functionality.
     * Covers successful requests, query parameters, and error cases.
     */
    describe('GET requests', () => {
        /** Test successful GET request with proper response handling. */
        test('should make successful GET request', async () => {
            const mockResponse = { data: 'test', status: 200 };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await apiService.get('/test-endpoint');

            expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/test-endpoint', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            expect(result).toEqual(mockResponse);
        });

        /** Test GET request with URL query parameters for pagination. */
        test('should handle GET request with query parameters', async () => {
            const mockResponse = { students: [] };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await apiService.get('/students?page=1&limit=10');

            expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/students?page=1&limit=10', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            expect(result).toEqual(mockResponse);
        });

        /** Test error handling for HTTP 404 and other client/server errors. */
        test('should throw error for failed GET request', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: jest.fn().mockResolvedValue({ detail: 'Not found' })
            });

            await expect(apiService.get('/nonexistent')).rejects.toThrow('HTTP error! status: 404');
        });

        /** Test handling of network connectivity issues and fetch rejections. */
        test('should handle network errors', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

            await expect(apiService.get('/test')).rejects.toThrow('Network error');
        });
    });

    describe('POST requests', () => {
        test('should make successful POST request', async () => {
            const mockData = { name: 'John', age: 25 };
            const mockResponse = { id: 1, ...mockData };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await apiService.post('/users', mockData);

            expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mockData)
            });
            expect(result).toEqual(mockResponse);
        });

        test('should handle POST request with empty body', async () => {
            const mockResponse = { success: true };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await apiService.post('/reset');

            expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: undefined
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('PUT requests', () => {
        test('should make successful PUT request', async () => {
            const mockData = { name: 'Updated John' };
            const mockResponse = { id: 1, ...mockData };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await apiService.put('/users/1', mockData);

            expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/users/1', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mockData)
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('DELETE requests', () => {
        test('should make successful DELETE request', async () => {
            const mockResponse = { deleted: true };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const result = await apiService.delete('/users/1');

            expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8000/api/users/1', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('Error handling', () => {
        test('should throw error for server errors', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: jest.fn().mockResolvedValue({ error: 'Server error' })
            });

            await expect(apiService.get('/test')).rejects.toThrow('HTTP error! status: 500');
        });

        test('should handle malformed JSON response', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
            });

            await expect(apiService.get('/test')).rejects.toThrow('Unexpected token');
        });

        test('should handle timeout errors', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(
                new Error('The operation was aborted due to timeout')
            );

            await expect(apiService.get('/test')).rejects.toThrow('The operation was aborted due to timeout');
        });
    });

    describe('Base URL configuration', () => {
        test('should use correct base URL for all requests', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({})
            });

            await apiService.get('/endpoint');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('http://127.0.0.1:8000/api/endpoint'),
                expect.any(Object)
            );
        });

        test('should handle endpoints with leading slash', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({})
            });

            await apiService.get('/endpoint');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/endpoint',
                expect.any(Object)
            );
        });

        test('should handle endpoints without leading slash', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({})
            });

            await apiService.get('endpoint');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/endpoint',
                expect.any(Object)
            );
        });
    });

    describe('Headers', () => {
        test('should include Content-Type header in all requests', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({})
            });

            await apiService.get('/test');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            );
        });

        test('should handle custom headers if needed', async () => {
            // This test would be for future header customization
            // Currently, the API service only sets Content-Type
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({})
            });

            await apiService.post('/test', { data: 'test' });

            const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
            expect(callArgs.headers['Content-Type']).toBe('application/json');
        });
    });

    describe('Request/Response logging', () => {
        test('should handle successful requests without throwing', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({ data: 'success' })
            });

            await apiService.get('/test');

            // Console logging is handled internally, just ensure no errors
            expect(consoleSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        test('should log errors appropriately', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

            await expect(apiService.get('/test')).rejects.toThrow('Network failure');

            // Error logging is handled internally
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('API request failed'),
                expect.any(Error)
            );
        });
    });

    /**
     * Test suite for validating payloads sent to the server in API requests.
     * Ensures data is correctly serialized, handles various data types, and validates structure.
     */
    describe('Payload Validation', () => {
        /**
         * Test that POST requests correctly serialize and send JSON payloads.
         */
        test('should correctly serialize and send valid JSON payload in POST requests', async () => {
            const mockData = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com',
                active: true,
                metadata: { key: 'value' }
            };
            const mockResponse = { id: 1, ...mockData };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await apiService.post('/users', mockData);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const requestBody = fetchCall[1].body;
            const parsedBody = JSON.parse(requestBody);

            expect(parsedBody).toEqual(mockData);
            expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
        });

        /**
         * Test that PUT requests correctly serialize and send JSON payloads.
         */
        test('should correctly serialize and send valid JSON payload in PUT requests', async () => {
            const mockData = {
                name: 'Updated Name',
                status: 'active'
            };
            const mockResponse = { id: 1, ...mockData };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await apiService.put('/users/1', mockData);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const requestBody = fetchCall[1].body;
            const parsedBody = JSON.parse(requestBody);

            expect(parsedBody).toEqual(mockData);
            expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
        });

        /**
         * Test handling of null or undefined payloads in POST requests.
         */
        test('should handle null payload in POST requests', async () => {
            const mockResponse = { success: true };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await apiService.post('/reset', null);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const requestBody = fetchCall[1].body;

            expect(requestBody).toBe('null');
        });

        /**
         * Test handling of empty object payloads.
         */
        test('should handle empty object payload in POST requests', async () => {
            const mockResponse = { success: true };
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await apiService.post('/empty', {});

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const requestBody = fetchCall[1].body;
            const parsedBody = JSON.parse(requestBody);

            expect(parsedBody).toEqual({});
        });

        /**
         * Test error case for invalid JSON serializable data.
         */
        test('should handle circular reference in payload gracefully', async () => {
            const circularObj: any = { name: 'test' };
            circularObj.self = circularObj;

            // Expect the post to throw due to JSON serialization error
            await expect(apiService.post('/test', circularObj)).rejects.toThrow();
        });

        /**
         * Test that payload validation fails for malformed data in error scenarios.
         */
        test('should reject request with invalid payload structure', async () => {
            // Simulate a server error due to invalid payload
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: jest.fn().mockResolvedValue('Invalid payload structure')
            });

            const invalidData = { invalidField: undefined }; // Assuming server expects specific fields

            const result = await apiService.post('/validate', invalidData);

            expect(result.error).toContain('HTTP 400');
        });
    });
});