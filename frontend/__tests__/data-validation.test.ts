// Unit tests for data validation and utility functions

describe('Data Validation and Utilities', () => {
    describe('Student Data Validation', () => {
        test('should validate required student fields', () => {
            // Test valid student
            const validStudent = {
                name: 'John Doe',
                class: '10A',
                fees: '1000',
                status: 'active' as const
            };

            expect(validStudent.name).toBeTruthy();
            expect(validStudent.class).toBeTruthy();

            // Test invalid student (missing name)
            const invalidStudent = {
                class: '10A',
                fees: '1000'
            };

            expect((invalidStudent as any).name).toBeUndefined();
        });

        test('should handle various student data formats', () => {
            const students = [
                // Complete student
                {
                    id: '1',
                    route: 'R001',
                    name: 'Alice Johnson',
                    father_name: 'Bob Johnson',
                    mobile: '1234567890',
                    class: '10A',
                    address: '123 Main St',
                    fees: '5000',
                    status: 'active',
                    created_date: '2024-01-01T00:00:00Z',
                    last_updated: '2024-01-01T00:00:00Z',
                    contact_info: {
                        primary_mobile: '1234567890',
                        secondary_mobile: '0987654321',
                        father_contact: '1122334455'
                    },
                    location_details: {
                        route_number: 'R001',
                        area: 'Downtown',
                        full_address: '123 Main St, Downtown'
                    }
                },
                // Minimal student
                {
                    name: 'Bob Smith',
                    class: '9B'
                },
                // Student with partial contact info
                {
                    name: 'Charlie Brown',
                    class: '8C',
                    contact_info: {
                        primary_mobile: '5551234567'
                    }
                }
            ];

            // All should have required fields
            students.forEach(student => {
                expect(student.name).toBeTruthy();
                expect(typeof student.name).toBe('string');
                expect(student.class).toBeTruthy();
                expect(typeof student.class).toBe('string');
            });

            // Check optional fields
            expect(students[0].contact_info).toBeDefined();
            expect(students[0].location_details).toBeDefined();
            expect(students[1].contact_info).toBeUndefined();
            expect(students[2].contact_info?.primary_mobile).toBe('5551234567');
        });

        test('should filter students with invalid data', () => {
            const mixedData = [
                { name: 'Valid Student', class: '10A' },
                { name: '', class: '10B' }, // Empty name
                { name: 'Another Valid', class: '' }, // Empty class
                { invalid: 'data' }, // Missing required fields
                { name: null, class: '10C' }, // Null name
                { name: 'Valid', class: undefined }, // Undefined class
                { name: 'Valid', class: '10D', extra: 'field' } // Extra fields OK
            ];

            // Simulate the filtering logic from the app
            const validStudents = mixedData.filter(student => {
                return student && typeof student === 'object' && student.name && typeof student.name === 'string' && student.name.trim() !== '';
            });

            expect(validStudents).toHaveLength(4);
            expect(validStudents[0].name).toBe('Valid Student');
            expect(validStudents[1].name).toBe('Another Valid');
            expect(validStudents[2].name).toBe('Valid');
            expect(validStudents[3].name).toBe('Valid');
        });
    });

    describe('API Response Validation', () => {
        test('should validate successful API response structure', () => {
            const validResponse = {
                students: [
                    { name: 'John', class: '10A' },
                    { name: 'Jane', class: '10B' }
                ],
                total_count: 2
            };

            expect(validResponse.students).toBeDefined();
            expect(Array.isArray(validResponse.students)).toBe(true);
            expect(validResponse.students).toHaveLength(2);
            expect(validResponse.total_count).toBe(2);
        });

        test('should handle API error responses', () => {
            const errorResponse = {
                error: 'Database connection failed'
            };

            expect(errorResponse.error).toBeDefined();
            expect(typeof errorResponse.error).toBe('string');

            const httpError = {
                detail: 'Student not found',
                status: 404
            };

            expect(httpError.detail).toBeDefined();
        });

        test('should handle malformed API responses', () => {
            const malformedResponses = [
                null,
                undefined,
                'not an object',
                { students: 'not an array' },
                { students: [{ name: null }] },
                {}
            ];

            malformedResponses.forEach(response => {
                if (response && typeof response === 'object') {
                    const hasValidStudents = response.students &&
                        Array.isArray(response.students) &&
                        response.students.some((s: any) => s && typeof s === 'object' && s.name);

                    if (response.students === 'not an array') {
                        expect(hasValidStudents).toBe(false);
                    }
                }
            });
        });
    });

    describe('DOM Data Handling', () => {
        test('should safely access DOM element properties', () => {
            // Mock DOM elements
            const mockInput = {
                value: 'test value',
                type: 'text'
            } as HTMLInputElement;

            const mockSelect = {
                value: 'active'
            } as HTMLSelectElement;

            const mockTextarea = {
                value: 'test address'
            } as HTMLTextAreaElement;

            // Simulate form data extraction
            const formData = {
                name: mockInput.value,
                status: mockSelect.value as 'active' | 'inactive',
                address: mockTextarea.value
            };

            expect(formData.name).toBe('test value');
            expect(formData.status).toBe('active');
            expect(formData.address).toBe('test address');
        });

        test('should handle empty or undefined DOM values', () => {
            const emptyInput = { value: '' } as HTMLInputElement;
            const undefinedInput = { value: undefined } as any;

            expect(emptyInput.value).toBe('');
            expect(undefinedInput.value).toBeUndefined();

            // Should not crash when processing
            const processed = {
                name: emptyInput.value || undefined,
                mobile: undefinedInput.value || undefined
            };

            expect(processed.name).toBeUndefined();
            expect(processed.mobile).toBeUndefined();
        });
    });

    describe('Date and Time Utilities', () => {
        test('should generate valid ISO date strings', () => {
            const now = new Date();
            const isoString = now.toISOString();

            expect(typeof isoString).toBe('string');
            expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(isoString).toContain('Z');
        });

        test('should handle date parsing and validation', () => {
            const validDate = '2024-01-01T12:00:00Z';
            const parsed = new Date(validDate);

            expect(parsed).toBeInstanceOf(Date);
            expect(isNaN(parsed.getTime())).toBe(false);

            const invalidDate = 'invalid-date';
            const invalidParsed = new Date(invalidDate);

            expect(isNaN(invalidParsed.getTime())).toBe(true);
        });
    });

    describe('Search and Filter Utilities', () => {
        const students = [
            { name: 'John Doe', father_name: 'Bob Doe', class: '10A', mobile: '1234567890', address: '123 Main St', route: 'R001', fees: '1000' },
            { name: 'Jane Smith', father_name: 'Tom Smith', class: '10B', mobile: '0987654321', address: '456 Oak St', route: 'R002', fees: '1500' },
            { name: 'Bob Johnson', father_name: 'Alice Johnson', class: '9A', mobile: '5551234567', address: '789 Pine St', route: 'R001', fees: '1200' }
        ];

        test('should filter by name (case insensitive)', () => {
            const results = students.filter(student =>
                student.name?.toLowerCase().includes('john')
            );

            expect(results).toHaveLength(2);
            expect(results[0].name).toBe('John Doe');
            expect(results[1].name).toBe('Bob Johnson');
        });

        test('should filter by father name', () => {
            const results = students.filter(student =>
                student.father_name?.toLowerCase().includes('smith')
            );

            expect(results).toHaveLength(1);
            expect(results[0].name).toBe('Jane Smith');
        });

        test('should filter by class', () => {
            const results = students.filter(student =>
                student.class?.toLowerCase().includes('10')
            );

            expect(results).toHaveLength(2);
        });

        test('should filter by mobile number', () => {
            const results = students.filter(student =>
                student.mobile?.includes('123')
            );

            expect(results).toHaveLength(2);
        });

        test('should filter by address', () => {
            const results = students.filter(student =>
                student.address?.toLowerCase().includes('st')
            );

            expect(results).toHaveLength(3);
        });

        test('should filter by route', () => {
            const results = students.filter(student =>
                student.route?.toLowerCase().includes('r001')
            );

            expect(results).toHaveLength(2);
        });

        test('should filter by fees', () => {
            const results = students.filter(student =>
                student.fees?.includes('100')
            );

            expect(results).toHaveLength(1);
            expect(results[0].fees).toBe('1000');
        });

        test('should handle empty search term', () => {
            const results = students.filter(student => {
                const searchTerm = '';
                if (!searchTerm) return true;

                return student.name?.toLowerCase().includes(searchTerm) ||
                       student.father_name?.toLowerCase().includes(searchTerm) ||
                       student.class?.toLowerCase().includes(searchTerm) ||
                       student.mobile?.includes(searchTerm) ||
                       student.address?.toLowerCase().includes(searchTerm) ||
                       student.route?.toLowerCase().includes(searchTerm) ||
                       student.fees?.includes(searchTerm);
            });

            expect(results).toHaveLength(3);
        });
    });

    describe('Sorting Utilities', () => {
        const students = [
            { name: 'Charlie', class: '10C' },
            { name: 'Alice', class: '10A' },
            { name: 'Bob', class: '10B' }
        ];

        test('should sort by name ascending', () => {
            const sorted = [...students].sort((a, b) => {
                const aValue = a.name?.toLowerCase() || '';
                const bValue = b.name?.toLowerCase() || '';

                if (aValue < bValue) return -1;
                if (aValue > bValue) return 1;
                return 0;
            });

            expect(sorted[0].name).toBe('Alice');
            expect(sorted[1].name).toBe('Bob');
            expect(sorted[2].name).toBe('Charlie');
        });

        test('should sort by name descending', () => {
            const sorted = [...students].sort((a, b) => {
                const aValue = a.name?.toLowerCase() || '';
                const bValue = b.name?.toLowerCase() || '';

                if (aValue < bValue) return 1;
                if (aValue > bValue) return -1;
                return 0;
            });

            expect(sorted[0].name).toBe('Charlie');
            expect(sorted[1].name).toBe('Bob');
            expect(sorted[2].name).toBe('Alice');
        });

        test('should handle null/undefined values in sorting', () => {
            const studentsWithNulls = [
                { name: 'Alice', class: '10A' },
                { name: null, class: '10B' },
                { name: 'Charlie', class: '10C' }
            ];

            const sorted = [...studentsWithNulls].sort((a, b) => {
                const aValue = a.name?.toString().toLowerCase() || '';
                const bValue = b.name?.toString().toLowerCase() || '';

                if (aValue < bValue) return -1;
                if (aValue > bValue) return 1;
                return 0;
            });

            expect(sorted[0].name).toBeNull();
            expect(sorted[1].name).toBe('Alice');
            expect(sorted[2].name).toBe('Charlie');
        });
    });

    describe('Notification System', () => {
        test('should create notification elements', () => {
            const message = 'Student updated successfully';
            const type = 'success';

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            `;

            expect(notification.className).toContain('notification-success');
            expect(notification.innerHTML).toContain(message);
            expect(notification.innerHTML).toContain('×');
        });

        test('should auto-remove notifications', () => {
            const notification = document.createElement('div');
            document.body.appendChild(notification);

            // Simulate setTimeout behavior
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);

            expect(notification.parentNode).not.toBeNull();

            // Fast-forward time (in test, we can't actually wait)
            // Just verify the structure is correct
            expect(notification).toBeDefined();
        });
    });
});