// Unit tests for ChartComponent custom element
// Using global test utilities and HTMLElement from jest.setup.js

interface ChartData {
    labels: string[];
    values: number[];
    colors?: string[];
    type: 'bar' | 'pie';
    title?: string;
}

describe('ChartComponent Custom Element', () => {
    let mockChart: any;

    beforeEach(() => {
        mockChart = new (global as any).MockChartComponent();

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('ChartComponent Initialization', () => {
        test('should initialize with null data', () => {
            expect(mockChart.data).toBeNull();
            expect(mockChart.canvas).toBeNull();
            expect(mockChart.ctx).toBeNull();
        });

        test('should attach shadow root', () => {
            mockChart.connectedCallback();
            expect(mockChart.shadowRoot).not.toBeNull();
        });

        test('should render initial template', () => {
            mockChart.connectedCallback();
            const html = mockChart.shadowRoot.innerHTML;
            expect(html).toContain('chart-container');
            expect(html).toContain('chart-header');
            expect(html).toContain('chart-content');
            expect(html).toContain('Chart');
        });
    });

    describe('Chart Data Setting', () => {
        test('should set bar chart data correctly', () => {
            const chartData: ChartData = {
                labels: ['Driver A', 'Driver B', 'Driver C'],
                values: [10, 15, 8],
                type: 'bar',
                title: 'Student Distribution'
            };

            mockChart.setData(chartData);
            expect(mockChart.data).toEqual(chartData);
        });

        test('should set pie chart data correctly', () => {
            const chartData: ChartData = {
                labels: ['Category A', 'Category B', 'Category C'],
                values: [30, 40, 30],
                type: 'pie',
                title: 'Revenue Breakdown'
            };

            mockChart.setData(chartData);
            expect(mockChart.data).toEqual(chartData);
        });

        test('should handle custom colors', () => {
            const customColors = ['#ff0000', '#00ff00', '#0000ff'];
            const chartData: ChartData = {
                labels: ['Red', 'Green', 'Blue'],
                values: [1, 2, 3],
                colors: customColors,
                type: 'bar',
                title: 'Custom Colors'
            };

            mockChart.setData(chartData);
            expect(mockChart.data.colors).toEqual(customColors);
        });
    });

    describe('Chart Rendering', () => {
        test('should render chart title correctly', () => {
            const chartData: ChartData = {
                labels: ['Test'],
                values: [1],
                type: 'bar',
                title: 'Test Chart Title'
            };

            mockChart.setData(chartData);
            const html = mockChart.shadowRoot.innerHTML;
            expect(html).toContain('Test Chart Title');
        });

        test('should render default title when none provided', () => {
            const chartData: ChartData = {
                labels: ['Test'],
                values: [1],
                type: 'bar'
            };

            mockChart.setData(chartData);
            const html = mockChart.shadowRoot.innerHTML;
            expect(html).toContain('Chart');
        });

        test('should handle empty data gracefully', () => {
            const chartData: ChartData = {
                labels: [],
                values: [],
                type: 'bar',
                title: 'Empty Chart'
            };

            expect(() => {
                mockChart.setData(chartData);
            }).not.toThrow();
        });
    });

    describe('Canvas Setup', () => {
        test('should setup canvas when connected', () => {
            mockChart.connectedCallback();
            expect(mockChart.canvas).toBeTruthy();
        });

        test('should resize canvas appropriately', () => {
            mockChart.connectedCallback();

            // Mock parent element dimensions
            mockChart.canvas.parentElement = {
                getBoundingClientRect: () => ({ width: 400, height: 300 })
            };

            mockChart.resizeCanvas();
            // Canvas should be resized (mock implementation)
            expect(mockChart.canvas.width).toBeDefined();
        });

        test('should handle canvas context creation', () => {
            mockChart.connectedCallback();
            expect(mockChart.ctx).toBeTruthy();
        });
    });

    describe('Chart Drawing', () => {
        test('should draw bar chart when type is bar', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [10, 20],
                type: 'bar'
            };

            mockChart.setData(chartData);

            // Mock drawBarChart to track calls
            const drawBarChartSpy = jest.spyOn(mockChart, 'drawBarChart');
            mockChart.drawChart();

            expect(drawBarChartSpy).toHaveBeenCalled();
        });

        test('should draw pie chart when type is pie', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [50, 50],
                type: 'pie'
            };

            mockChart.setData(chartData);

            // Mock drawPieChart to track calls
            const drawPieChartSpy = jest.spyOn(mockChart, 'drawPieChart');
            mockChart.drawChart();

            expect(drawPieChartSpy).toHaveBeenCalled();
        });

        test('should not draw chart when data is null', () => {
            mockChart.data = null;
            const drawBarChartSpy = jest.spyOn(mockChart, 'drawBarChart');
            const drawPieChartSpy = jest.spyOn(mockChart, 'drawPieChart');

            mockChart.drawChart();

            expect(drawBarChartSpy).not.toHaveBeenCalled();
            expect(drawPieChartSpy).not.toHaveBeenCalled();
        });

        test('should not draw chart when canvas context is null', () => {
            const chartData: ChartData = {
                labels: ['A'],
                values: [1],
                type: 'bar'
            };
            mockChart.setData(chartData);
            mockChart.ctx = null;

            const drawBarChartSpy = jest.spyOn(mockChart, 'drawBarChart');
            mockChart.drawChart();

            expect(drawBarChartSpy).not.toHaveBeenCalled();
        });
    });

    describe('Bar Chart Drawing', () => {
        test('should handle bar chart calculations', () => {
            const chartData: ChartData = {
                labels: ['Driver A', 'Driver B', 'Driver C'],
                values: [5, 15, 10],
                type: 'bar'
            };

            mockChart.setData(chartData);

            // Test that drawBarChart doesn't throw
            expect(() => {
                mockChart.drawBarChart();
            }).not.toThrow();
        });

        test('should handle zero values in bar chart', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [0, 10],
                type: 'bar'
            };

            mockChart.setData(chartData);

            expect(() => {
                mockChart.drawBarChart();
            }).not.toThrow();
        });

        test('should handle negative values gracefully', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [-5, 10],
                type: 'bar'
            };

            mockChart.setData(chartData);

            expect(() => {
                mockChart.drawBarChart();
            }).not.toThrow();
        });
    });

    describe('Pie Chart Drawing', () => {
        test('should handle pie chart calculations', () => {
            const chartData: ChartData = {
                labels: ['Slice A', 'Slice B'],
                values: [40, 60],
                type: 'pie'
            };

            mockChart.setData(chartData);

            expect(() => {
                mockChart.drawPieChart();
            }).not.toThrow();
        });

        test('should handle single slice pie chart', () => {
            const chartData: ChartData = {
                labels: ['Single'],
                values: [100],
                type: 'pie'
            };

            mockChart.setData(chartData);

            expect(() => {
                mockChart.drawPieChart();
            }).not.toThrow();
        });

        test('should handle zero total values gracefully', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [0, 0],
                type: 'pie'
            };

            mockChart.setData(chartData);

            expect(() => {
                mockChart.drawPieChart();
            }).not.toThrow();
        });
    });

    describe('Color Handling', () => {
        test('should use default colors when none provided', () => {
            const chartData: ChartData = {
                labels: ['A', 'B', 'C'],
                values: [1, 2, 3],
                type: 'bar'
            };

            mockChart.setData(chartData);
            expect(mockChart.data.colors).toBeUndefined();
        });

        test('should handle insufficient custom colors', () => {
            const chartData: ChartData = {
                labels: ['A', 'B', 'C', 'D'],
                values: [1, 2, 3, 4],
                colors: ['#ff0000', '#00ff00'], // Only 2 colors for 4 items
                type: 'bar'
            };

            mockChart.setData(chartData);

            // Should cycle through available colors
            expect(() => {
                mockChart.drawBarChart();
            }).not.toThrow();
        });
    });

    describe('Lifecycle Methods', () => {
        test('should handle connectedCallback', () => {
            expect(() => {
                mockChart.connectedCallback();
            }).not.toThrow();
        });

        test('should handle disconnectedCallback', () => {
            mockChart.connectedCallback();

            expect(() => {
                mockChart.disconnectedCallback();
            }).not.toThrow();
        });
    });

    describe('Data Validation', () => {
        test('should handle null data in setData', () => {
            expect(() => {
                mockChart.setData(null as any);
            }).not.toThrow();
        });

        test('should handle malformed chart data', () => {
            const malformedData = {
                labels: null,
                values: undefined,
                type: 'invalid'
            };

            expect(() => {
                mockChart.setData(malformedData as any);
            }).not.toThrow();
        });

        test('should handle mismatched labels and values lengths', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'], // 2 labels
                values: [1, 2, 3], // 3 values
                type: 'bar'
            };

            expect(() => {
                mockChart.setData(chartData);
                mockChart.drawChart();
            }).not.toThrow();
        });
    });

    describe('Custom Element Registration', () => {
        test('should register chart-component custom element', () => {
            // Import should trigger customElements.define
            require('../src/ts/script');

            expect(mockCustomElements.define).toHaveBeenCalledWith(
                'chart-component',
                expect.any(Function)
            );
        });
    });

    describe('Accessibility Features', () => {
        test('should set ARIA attributes on canvas', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [10, 20],
                type: 'bar',
                title: 'Test Chart'
            };

            mockChart.setData(chartData);
            mockChart.render();

            expect(mockChart.shadowRoot.innerHTML).toContain('role="img"');
            expect(mockChart.shadowRoot.innerHTML).toContain('aria-label="Test Chart bar chart"');
            expect(mockChart.shadowRoot.innerHTML).toContain('aria-describedby="chart-data-table"');
            expect(mockChart.shadowRoot.innerHTML).toContain('tabindex="0"');
        });

        test('should generate accessible data table', () => {
            const chartData: ChartData = {
                labels: ['Category A', 'Category B'],
                values: [30, 70],
                type: 'pie',
                title: 'Test Pie Chart'
            };

            mockChart.setData(chartData);

            const dataTableHTML = mockChart.generateDataTable();
            expect(dataTableHTML).toContain('role="table"');
            expect(dataTableHTML).toContain('aria-label="Test Pie Chart data table - pie chart"');
            expect(dataTableHTML).toContain('<th scope="col">Label</th>');
            expect(dataTableHTML).toContain('<th scope="col">Value</th>');
            expect(dataTableHTML).toContain('<td>Category A</td><td>30</td>');
            expect(dataTableHTML).toContain('<td>Category B</td><td>70</td>');
        });

        test('should provide alternative data access methods', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [1, 2],
                type: 'bar',
                title: 'Test'
            };

            mockChart.setData(chartData);

            expect(mockChart.getChartData()).toEqual(chartData);
            expect(mockChart.getDataSummary()).toContain('Test (bar chart)');
            expect(mockChart.getDataSummary()).toContain('A: 1');
            expect(mockChart.getDataSummary()).toContain('B: 2');

            const csv = mockChart.exportAsCSV();
            expect(csv).toContain('Label,Value');
            expect(csv).toContain('"A",1');
            expect(csv).toContain('"B",2');
        });

        test('should handle keyboard navigation', () => {
            const chartData: ChartData = {
                labels: ['First', 'Second', 'Third'],
                values: [10, 20, 30],
                type: 'bar'
            };

            mockChart.setData(chartData);

            // Mock keyboard events
            const mockEvent = {
                key: 'ArrowRight',
                preventDefault: jest.fn()
            };

            // Trigger keyboard navigation (mock setup)
            mockChart.setupKeyboardNavigation();

            expect(() => {
                // Simulate keydown event
                if (mockChart.canvas) {
                    mockChart.canvas.dispatchEvent(new KeyboardEvent('keydown', mockEvent));
                }
            }).not.toThrow();
        });

        test('should announce data changes via live region', () => {
            const chartData: ChartData = {
                labels: ['A', 'B'],
                values: [100, 200],
                type: 'bar',
                title: 'Updated Chart'
            };

            mockChart.setData(chartData);

            const announcer = mockChart.shadowRoot.querySelector('#chart-announcer');
            expect(announcer).toBeTruthy();
            expect(announcer.getAttribute('aria-live')).toBe('polite');
        });
    });
});

// Additional tests for specific chart functionality
describe('Chart Component Integration', () => {
    test('should handle real chart data format', () => {
        const realChartData = {
            labels: ['Driver A', 'Driver B', 'Driver C'],
            values: [25, 30, 20],
            colors: ['#667eea', '#764ba2', '#f093fb'],
            type: 'bar' as const,
            title: 'Student Distribution by Driver'
        };

        const chart = new (global as any).MockChartComponent();
        chart.setData(realChartData);

        expect(chart.getData()).toEqual(realChartData);
        expect(chart.getData().labels.length).toBe(3);
        expect(chart.getData().values.length).toBe(3);
    });

    test('should handle chart data transformation', () => {
        const apiResponse = {
            labels: ['A', 'B'],
            values: ['10', '20'], // String values from API
            type: 'bar'
        };

        // Simulate what frontend does with API data
        const transformedData = {
            ...apiResponse,
            values: apiResponse.values.map(v => parseInt(v))
        };

        const chart = new (global as any).MockChartComponent();
        chart.setData(transformedData);

        expect(chart.getData().values).toEqual([10, 20]);
    });
});