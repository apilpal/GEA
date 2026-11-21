/**
 * Integration tests for CSV sync service functionality.
 *
 * Tests the CSV synchronization service that handles loading driver data
 * from CSV files and syncing it with the database.
 */

import { apiService } from '../../src/ts/services/api-service';
import { CSVSyncer, SyncConfig } from '../../src/ts/services/csv-sync-service';

describe('CSV Sync Service Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('CSV File Discovery', () => {
        test('should discover CSV files in configured directory', async () => {
            // Arrange
            const expectedFiles = [
                { name: 'drivers.csv', size: 1024, recordCount: 10 },
                { name: 'chacha_raw.csv', size: 2048, recordCount: 15 }
            ];

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => expectedFiles
            } as Response);

            // Act
            const result = await apiService.get('/csv/files');

            // Assert
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/csv/files'),
                expect.any(Object)
            );
            expect(result.data).toEqual(expectedFiles);
        });

        test('should handle empty CSV directory', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => []
            } as Response);

            // Act
            const result = await apiService.get('/csv/files');

            // Assert
            expect(result.data).toEqual([]);
        });

        test('should handle CSV discovery errors', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            } as Response);

            // Act & Assert
            await expect(apiService.get('/csv/files')).rejects.toThrow('Internal Server Error');
        });
    });

    describe('CSV Sync Operations', () => {
        test('should sync all CSV files successfully', async () => {
            // Arrange
            const syncResult = {
                summary: {
                    total_files_processed: 2,
                    successful_files: 2,
                    files_with_errors: 0,
                    total_records: 25,
                    successful_records: 25,
                    error_records: 0,
                    success_rate: 100.0
                },
                errors: [],
                warnings: [],
                file_details: {
                    'drivers.csv': {
                        success: true,
                        total_records: 10,
                        success_count: 10,
                        error_count: 0,
                        duration_seconds: 1.5
                    },
                    'chacha_raw.csv': {
                        success: true,
                        total_records: 15,
                        success_count: 15,
                        error_count: 0,
                        duration_seconds: 2.1
                    }
                }
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => syncResult
            } as Response);

            // Act
            const result = await apiService.post('/csv/sync', {});

            // Assert
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/csv/sync'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );
            expect(result.data.summary.success_rate).toBe(100.0);
            expect(result.data.summary.total_records).toBe(25);
        });

        test('should sync individual CSV file', async () => {
            // Arrange
            const fileName = 'drivers.csv';
            const syncResult = {
                success: true,
                total_records: 10,
                success_count: 10,
                error_count: 0,
                errors: [],
                warnings: [],
                start_time: '2024-01-15T10:00:00Z',
                end_time: '2024-01-15T10:00:01Z',
                duration_seconds: 1.2
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => syncResult
            } as Response);

            // Act
            const result = await apiService.post(`/csv/sync/${fileName}`, {});

            // Assert
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining(`/csv/sync/${fileName}`),
                expect.any(Object)
            );
            expect(result.data.success).toBe(true);
            expect(result.data.success_count).toBe(10);
        });

        test('should handle partial sync failures', async () => {
            // Arrange
            const syncResult = {
                summary: {
                    total_files_processed: 2,
                    successful_files: 1,
                    files_with_errors: 1,
                    total_records: 25,
                    successful_records: 20,
                    error_records: 5,
                    success_rate: 80.0
                },
                errors: ['Failed to parse drivers.csv: Invalid format'],
                warnings: ['Warning in chacha_raw.csv: Missing optional field'],
                file_details: {
                    'drivers.csv': {
                        success: false,
                        total_records: 10,
                        success_count: 5,
                        error_count: 5,
                        duration_seconds: 1.5
                    },
                    'chacha_raw.csv': {
                        success: true,
                        total_records: 15,
                        success_count: 15,
                        error_count: 0,
                        duration_seconds: 2.1
                    }
                }
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => syncResult
            } as Response);

            // Act
            const result = await apiService.post('/csv/sync', {});

            // Assert
            expect(result.data.summary.success_rate).toBe(80.0);
            expect(result.data.errors).toContain('Failed to parse drivers.csv: Invalid format');
            expect(result.data.warnings).toContain('Warning in chacha_raw.csv: Missing optional field');
            expect(result.data.file_details['drivers.csv'].success).toBe(false);
        });
    });

    describe('CSV Sync Status and History', () => {
        test('should retrieve CSV sync status', async () => {
            // Arrange
            const statusResponse = {
                status: 'idle',
                last_sync: '2024-01-15T09:00:00Z',
                next_scheduled_sync: '2024-01-15T15:00:00Z',
                active_syncs: 0,
                pending_files: 2
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => statusResponse
            } as Response);

            // Act
            const result = await apiService.get('/csv/status');

            // Assert
            expect(result.data.status).toBe('idle');
            expect(result.data.pending_files).toBe(2);
        });

        test('should retrieve CSV sync history', async () => {
            // Arrange
            const historyResponse = {
                total_syncs: 5,
                successful_syncs: 4,
                failed_syncs: 1,
                recent_syncs: [
                    {
                        id: 'sync_001',
                        timestamp: '2024-01-15T10:00:00Z',
                        success: true,
                        total_records: 25,
                        success_count: 25,
                        error_count: 0,
                        duration_seconds: 3.5
                    },
                    {
                        id: 'sync_002',
                        timestamp: '2024-01-14T10:00:00Z',
                        success: false,
                        total_records: 20,
                        success_count: 15,
                        error_count: 5,
                        duration_seconds: 2.8
                    }
                ]
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => historyResponse
            } as Response);

            // Act
            const result = await apiService.get('/csv/history');

            // Assert
            expect(result.data.total_syncs).toBe(5);
            expect(result.data.successful_syncs).toBe(4);
            expect(result.data.recent_syncs).toHaveLength(2);
            expect(result.data.recent_syncs[0].success).toBe(true);
        });
    });

    describe('CSV File Information', () => {
        test('should get detailed CSV file information', async () => {
            // Arrange
            const fileName = 'chacha_raw.csv';
            const fileInfo = {
                file_name: fileName,
                file_size: 2048,
                record_count: 15,
                errors: [],
                delimiter: ',',
                last_modified: '2024-01-15T08:30:00Z',
                headers: ['name', 'route', 'status', 'vehicle_number', 'contact_number'],
                sample_records: [
                    {
                        name: 'John Doe',
                        route: 'Route A',
                        status: 'active',
                        vehicle_number: 'ABC123',
                        contact_number: '+1234567890'
                    }
                ]
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => fileInfo
            } as Response);

            // Act
            const result = await apiService.get(`/csv/files/${fileName}`);

            // Assert
            expect(result.data.file_name).toBe(fileName);
            expect(result.data.record_count).toBe(15);
            expect(result.data.delimiter).toBe(',');
            expect(result.data.headers).toHaveLength(5);
            expect(result.data.sample_records).toHaveLength(1);
        });

        test('should handle non-existent CSV file', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'File not found'
            } as Response);

            // Act & Assert
            await expect(apiService.get('/csv/files/nonexistent.csv')).rejects.toThrow('File not found');
        });
    });

    describe('CSV Sync Health Checks', () => {
        test('should perform CSV sync health check', async () => {
            // Arrange
            const healthResponse = {
                status: 'healthy',
                checks: {
                    csv_directory_accessible: true,
                    database_connection: true,
                    file_permissions: true,
                    last_sync_recent: true
                },
                details: {
                    csv_directory: 'backend/data/drivers',
                    total_files: 2,
                    last_sync_age_hours: 2.5,
                    database_status: 'connected'
                }
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => healthResponse
            } as Response);

            // Act
            const result = await apiService.get('/csv/health');

            // Assert
            expect(result.data.status).toBe('healthy');
            expect(result.data.checks.csv_directory_accessible).toBe(true);
            expect(result.data.checks.database_connection).toBe(true);
            expect(result.data.details.total_files).toBe(2);
        });

        test('should detect unhealthy CSV sync service', async () => {
            // Arrange
            const healthResponse = {
                status: 'unhealthy',
                checks: {
                    csv_directory_accessible: false,
                    database_connection: true,
                    file_permissions: false,
                    last_sync_recent: false
                },
                details: {
                    csv_directory: 'backend/data/drivers',
                    total_files: 0,
                    last_sync_age_hours: 72,
                    database_status: 'connected'
                }
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => healthResponse
            } as Response);

            // Act
            const result = await apiService.get('/csv/health');

            // Assert
            expect(result.data.status).toBe('unhealthy');
            expect(result.data.checks.csv_directory_accessible).toBe(false);
            expect(result.data.checks.file_permissions).toBe(false);
            expect(result.data.details.last_sync_age_hours).toBe(72);
        });
    });

    describe('Error Scenarios', () => {
        test('should handle network errors during CSV sync', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(
                new Error('Network Error')
            );

            // Act & Assert
            await expect(apiService.post('/csv/sync', {})).rejects.toThrow('Network Error');
        });

        test('should handle server errors during file discovery', async () => {
            // Arrange
            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 503,
                statusText: 'Service Unavailable'
            } as Response);

            // Act & Assert
            await expect(apiService.get('/csv/files')).rejects.toThrow('Service Unavailable');
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
            await expect(apiService.get('/csv/status')).rejects.toThrow();
        });

        test('should handle rate limiting during sync operations', async () => {
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
            await expect(apiService.post('/csv/sync', {})).rejects.toThrow('Too Many Requests');
        });
    });

    describe('CSV Sync Configuration', () => {
        test('should retrieve CSV sync configuration', async () => {
            // Arrange
            const configResponse = {
                csv_directory: 'backend/data/drivers',
                supported_delimiters: [',', ';', '\t'],
                batch_size: 100,
                validate_headers: true,
                skip_duplicates: true,
                create_missing_routes: false,
                email_notifications: false
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => configResponse
            } as Response);

            // Act
            const result = await apiService.get('/csv/config');

            // Assert
            expect(result.data.csv_directory).toBe('backend/data/drivers');
            expect(result.data.batch_size).toBe(100);
            expect(result.data.supported_delimiters).toEqual([',', ';', '\t']);
            expect(result.data.validate_headers).toBe(true);
        });

        test('should update CSV sync configuration', async () => {
            // Arrange
            const newConfig = {
                batch_size: 200,
                email_notifications: true,
                skip_duplicates: false
            };

            const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                json: async () => ({ message: 'Configuration updated successfully' })
            } as Response);

            // Act
            const result = await apiService.put('/csv/config', newConfig);

            // Assert
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/csv/config'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify(newConfig)
                })
            );
            expect(result.data.message).toContain('Configuration updated successfully');
        });
    });
});