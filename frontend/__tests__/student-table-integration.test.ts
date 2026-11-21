/**
 * Integration tests for student table component.
 *
 * Tests the complete student table functionality including
 * data loading, user interactions, and component lifecycle.
 */

import { StudentTable } from '../src/ts/components/students/student-table';
import { apiService } from '../src/ts/services/api-service';

// Mock the API service
jest.mock('../src/ts/services/api-service');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

// Mock custom elements registry
const mockCustomElements = {
    define: jest.fn(),
    get: jest.fn()
};
global.customElements = mockCustomElements;

// Mock DOM elements
let mockContainer: HTMLElement;

beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.innerHTML = '';

    // Mock document methods
    document.createElement = jest.fn().mockImplementation((tagName: string) => {
        const element = {
            tagName: tagName.toUpperCase(),
            innerHTML: '',
            textContent: '',
            style: {},
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(),
                toggle: jest.fn()
            },
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(),
            getAttribute: jest.fn(),
            setAttribute: jest.fn(),
            appendChild: jest.fn(),
            getElementById: jest.fn(),
            shadowRoot: {
                innerHTML: '',
                getElementById: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(),
                addEventListener: jest.fn()
            },
            attachShadow: jest.fn().mockReturnValue({
                innerHTML: '',
                getElementById: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn(),
                addEventListener: jest.fn()
            })
        };
        return element as any;
    });
});

describe('StudentTable Integration', () => {
    let studentTable: StudentTable;

    beforeEach(() => {
        studentTable = new StudentTable();
        mockContainer.appendChild(studentTable);
    });

    describe('Data Loading and Display', () => {
        test('should load and display student data', () => {
            const mockStudents = [
                {
                    id: 1,
                    name: 'John Doe',
                    father_name: 'Father Doe',
                    class: '10',
                    mobile: '1234567890',
                    route: 'Route A',
                    fees: '1000',
                    address: 'Test Address 1',
                    status: 'active'
                },
                {
                    id: 2,
                    name: 'Jane Smith',
                    father_name: 'Father Smith',
                    class: '9',
                    mobile: '9876543210',
                    route: 'Route B',
                    fees: '1200',
                    address: 'Test Address 2',
                    status: 'active'
                }
            ];

            studentTable.setStudents(mockStudents);

            // Verify students were set
            expect(studentTable['students']).toEqual(mockStudents);
            expect(studentTable['originalStudents']).toEqual(mockStudents);
        });

        test('should handle empty student data', () => {
            studentTable.setStudents([]);

            expect(studentTable['students']).toEqual([]);
            expect(studentTable['originalStudents']).toEqual([]);
        });

        test('should render table correctly', () => {
            const mockStudents = [
                {
                    id: 1,
                    name: 'Test Student',
                    father_name: 'Test Father',
                    class: '10',
                    mobile: '1234567890',
                    route: 'Test Route',
                    fees: '1000',
                    address: 'Test Address',
                    status: 'active'
                }
            ];

            studentTable.setStudents(mockStudents);

            // Trigger render
            studentTable['render']();

            // Check that shadow root was updated
            expect(studentTable.shadowRoot.innerHTML).toContain('Test Student');
            expect(studentTable.shadowRoot.innerHTML).toContain('Test Father');
        });
    });

    describe('Search Functionality', () => {
        beforeEach(() => {
            const mockStudents = [
                {
                    id: 1,
                    name: 'John Doe',
                    father_name: 'Father Doe',
                    class: '10',
                    mobile: '1234567890',
                    route: 'Route A',
                    fees: '1000',
                    address: 'Address 1',
                    status: 'active'
                },
                {
                    id: 2,
                    name: 'Jane Smith',
                    father_name: 'Father Smith',
                    class: '9',
                    mobile: '9876543210',
                    route: 'Route B',
                    fees: '1200',
                    address: 'Address 2',
                    status: 'active'
                },
                {
                    id: 3,
                    name: 'Bob Johnson',
                    father_name: 'Father Johnson',
                    class: '10',
                    mobile: '5556667777',
                    route: 'Route A',
                    fees: '900',
                    address: 'Address 3',
                    status: 'active'
                }
            ];

            studentTable.setStudents(mockStudents);
        });

        test('should filter students by name', () => {
            studentTable['searchTerm'] = 'John';
            studentTable['filterStudents']();

            expect(studentTable['students']).toHaveLength(2);
            expect(studentTable['students'][0].name).toBe('John Doe');
            expect(studentTable['students'][1].name).toBe('Bob Johnson');
        });

        test('should filter students by father name', () => {
            studentTable['searchTerm'] = 'Father Smith';
            studentTable['filterStudents']();

            expect(studentTable['students']).toHaveLength(1);
            expect(studentTable['students'][0].father_name).toBe('Father Smith');
        });

        test('should filter students by class', () => {
            studentTable['searchTerm'] = '10';
            studentTable['filterStudents']();

            expect(studentTable['students']).toHaveLength(2);
            expect(studentTable['students'][0].class).toBe('10');
            expect(studentTable['students'][1].class).toBe('10');
        });

        test('should filter students by mobile', () => {
            studentTable['searchTerm'] = '1234567890';
            studentTable['filterStudents']();

            expect(studentTable['students']).toHaveLength(1);
            expect(studentTable['students'][0].mobile).toBe('1234567890');
        });

        test('should filter students by route', () => {
            studentTable['searchTerm'] = 'Route A';
            studentTable['filterStudents']();

            expect(studentTable['students']).toHaveLength(2);
            expect(studentTable['students'][0].route).toBe('Route A');
            expect(studentTable['students'][1].route).toBe('Route A');
        });

        test('should handle case insensitive search', () => {
            studentTable['searchTerm'] = 'jane';
            studentTable['filterStudents']();

            expect(studentTable['students']).toHaveLength(1);
            expect(studentTable['students'][0].name).toBe('Jane Smith');
        });

        test('should clear search and show all students', () => {
            // First filter
            studentTable['searchTerm'] = 'John';
            studentTable['filterStudents']();
            expect(studentTable['students']).toHaveLength(2);

            // Clear search
            studentTable['searchTerm'] = '';
            studentTable['filterStudents']();
            expect(studentTable['students']).toHaveLength(3);
        });
    });

    describe('Sorting Functionality', () => {
        beforeEach(() => {
            const mockStudents = [
                {
                    id: 1,
                    name: 'Charlie',
                    father_name: 'Father C',
                    class: '10',
                    mobile: '1111111111',
                    route: 'Route C',
                    fees: '1100',
                    address: 'Address C',
                    status: 'active'
                },
                {
                    id: 2,
                    name: 'Alice',
                    father_name: 'Father A',
                    class: '9',
                    mobile: '2222222222',
                    route: 'Route A',
                    fees: '1000',
                    address: 'Address A',
                    status: 'active'
                },
                {
                    id: 3,
                    name: 'Bob',
                    father_name: 'Father B',
                    class: '8',
                    mobile: '3333333333',
                    route: 'Route B',
                    fees: '900',
                    address: 'Address B',
                    status: 'active'
                }
            ];

            studentTable.setStudents(mockStudents);
        });

        test('should sort by name ascending', () => {
            studentTable['sortTable']('name');

            expect(studentTable['sortColumn']).toBe('name');
            expect(studentTable['sortAscending']).toBe(true);
            expect(studentTable['students'][0].name).toBe('Alice');
            expect(studentTable['students'][1].name).toBe('Bob');
            expect(studentTable['students'][2].name).toBe('Charlie');
        });

        test('should sort by name descending', () => {
            studentTable['sortTable']('name'); // First click - ascending
            studentTable['sortTable']('name'); // Second click - descending

            expect(studentTable['sortColumn']).toBe('name');
            expect(studentTable['sortAscending']).toBe(false);
            expect(studentTable['students'][0].name).toBe('Charlie');
            expect(studentTable['students'][1].name).toBe('Bob');
            expect(studentTable['students'][2].name).toBe('Alice');
        });

        test('should sort by class numerically', () => {
            studentTable['sortTable']('class');

            expect(studentTable['students'][0].class).toBe('8');
            expect(studentTable['students'][1].class).toBe('9');
            expect(studentTable['students'][2].class).toBe('10');
        });

        test('should sort by route alphabetically', () => {
            studentTable['sortTable']('route');

            expect(studentTable['students'][0].route).toBe('Route A');
            expect(studentTable['students'][1].route).toBe('Route B');
            expect(studentTable['students'][2].route).toBe('Route C');
        });

        test('should handle null values in sorting', () => {
            const studentsWithNulls = [
                {
                    id: 1,
                    name: 'Student A',
                    father_name: 'Father A',
                    class: null,
                    mobile: '1111111111',
                    route: 'Route A',
                    fees: '1000',
                    address: 'Address A',
                    status: 'active'
                },
                {
                    id: 2,
                    name: 'Student B',
                    father_name: 'Father B',
                    class: '10',
                    mobile: '2222222222',
                    route: 'Route B',
                    fees: '1100',
                    address: 'Address B',
                    status: 'active'
                }
            ];

            studentTable.setStudents(studentsWithNulls);
            studentTable['sortTable']('class');

            // Null values should be sorted last
            expect(studentTable['students'][0].class).toBe('10');
            expect(studentTable['students'][1].class).toBeNull();
        });
    });

    describe('User Interactions', () => {
        beforeEach(() => {
            const mockStudents = [
                {
                    id: 1,
                    name: 'Test Student',
                    father_name: 'Test Father',
                    class: '10',
                    mobile: '1234567890',
                    route: 'Test Route',
                    fees: '1000',
                    address: 'Test Address',
                    status: 'active'
                }
            ];

            studentTable.setStudents(mockStudents);
            // Mock the shadow root elements that would be created during render
            studentTable.shadowRoot.getElementById = jest.fn((id: string) => {
                if (id === 'search-input') {
                    return { value: '', addEventListener: jest.fn() } as any;
                }
                if (id === 'clear-search') {
                    return { style: {}, addEventListener: jest.fn() } as any;
                }
                return null;
            });
        });

        test('should dispatch add-student event', () => {
            const dispatchEventSpy = jest.spyOn(studentTable, 'dispatchEvent');

            // Mock add button click
            const mockAddButton = { addEventListener: jest.fn() };
            studentTable.shadowRoot.getElementById = jest.fn((id: string) => {
                if (id === 'add-student-btn') return mockAddButton as any;
                return null;
            });

            studentTable['setupEventListeners']();
            studentTable['addBtn'] = mockAddButton as any;

            // Simulate button click
            const clickHandler = mockAddButton.addEventListener.mock.calls[0][1];
            clickHandler();

            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'add-student',
                    bubbles: true,
                    composed: true
                })
            );
        });

        test('should dispatch student-action events', () => {
            const dispatchEventSpy = jest.spyOn(studentTable, 'dispatchEvent');

            // Mock event delegation
            studentTable.shadowRoot.addEventListener = jest.fn((event: string, handler: Function) => {
                if (event === 'click') {
                    // Simulate click on action button
                    const mockEvent = {
                        target: {
                            classList: { contains: () => true },
                            dataset: { action: 'view', index: '0' }
                        },
                        stopPropagation: jest.fn()
                    };
                    handler(mockEvent);
                }
            });

            studentTable['setupEventListeners']();

            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'student-action',
                    detail: { action: 'view', index: 0 },
                    bubbles: true,
                    composed: true
                })
            );
        });
    });

    describe('Performance and Large Datasets', () => {
        test('should use lazy rendering for large datasets', () => {
            const largeDataset = Array.from({ length: 150 }, (_, i) => ({
                id: i + 1,
                name: `Student ${i + 1}`,
                father_name: `Father ${i + 1}`,
                class: '10',
                mobile: `100000000${i}`,
                route: 'Route A',
                fees: '1000',
                address: `Address ${i + 1}`,
                status: 'active'
            }));

            studentTable.setStudents(largeDataset);

            // Mock render methods
            const lazyRenderSpy = jest.spyOn(studentTable as any, 'renderLazy');
            const fullRenderSpy = jest.spyOn(studentTable as any, 'renderFull');

            studentTable['render']();

            expect(lazyRenderSpy).toHaveBeenCalled();
            expect(fullRenderSpy).not.toHaveBeenCalled();
        });

        test('should use full rendering for small datasets', () => {
            const smallDataset = [
                {
                    id: 1,
                    name: 'Student 1',
                    father_name: 'Father 1',
                    class: '10',
                    mobile: '1000000001',
                    route: 'Route A',
                    fees: '1000',
                    address: 'Address 1',
                    status: 'active'
                }
            ];

            studentTable.setStudents(smallDataset);

            const lazyRenderSpy = jest.spyOn(studentTable as any, 'renderLazy');
            const fullRenderSpy = jest.spyOn(studentTable as any, 'renderFull');

            studentTable['render']();

            expect(fullRenderSpy).toHaveBeenCalled();
            expect(lazyRenderSpy).not.toHaveBeenCalled();
        });
    });

    describe('Component Lifecycle', () => {
        test('should clean up event listeners on disconnect', () => {
            const removeEventListenersSpy = jest.spyOn(studentTable as any, 'removeEventListeners');

            studentTable.disconnectedCallback();

            expect(removeEventListenersSpy).toHaveBeenCalled();
        });

        test('should initialize properly on connect', () => {
            const setupEventListenersSpy = jest.spyOn(studentTable as any, 'setupEventListeners');

            studentTable.connectedCallback();

            expect(setupEventListenersSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid student data gracefully', () => {
            const invalidStudents = [
                {
                    id: 1,
                    name: null,
                    father_name: undefined,
                    class: '10',
                    mobile: '1234567890',
                    route: 'Route A',
                    fees: '1000',
                    address: null,
                    status: 'active'
                }
            ];

            studentTable.setStudents(invalidStudents);

            // Should not throw errors and render fallback values
            studentTable['render']();

            expect(studentTable.shadowRoot.innerHTML).toContain('N/A');
        });

        test('should handle missing shadow root', () => {
            // Temporarily remove shadow root
            const originalShadowRoot = studentTable.shadowRoot;
            (studentTable as any).shadowRoot = null;

            // Should not throw errors
            expect(() => {
                studentTable['updateTableBody']();
                studentTable['updateTotalCount']();
            }).not.toThrow();

            // Restore shadow root
            (studentTable as any).shadowRoot = originalShadowRoot;
        });
    });
});