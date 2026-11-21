// Unit tests for ChartComponent custom element (JavaScript version)
// Using global test utilities and HTMLElement from jest.setup.js

describe('ChartComponent Custom Element (JS)', () => {
    let mockChart;

    beforeEach(() => {
        mockChart = new global.MockChartComponent();

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
            const chartData = {
                labels: ['Driver A', 'Driver B', 'Driver C'],
                values: [10, 15, 8],
                type: 'bar',
                title: 'Student Distribution'
            };

            mockChart.setData(chartData);
            expect(mockChart.data).toEqual(chartData);
        });

        test('should set pie chart data correctly', () => {
            const chartData = {
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
            const chartData = {
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
            const chartData = {
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
            const chartData = {
                labels: ['Test'],
                values: [1],
                type: 'bar'
            };

            mockChart.setData(chartData);
            const html = mockChart.shadowRoot.innerHTML;
            expect(html).toContain('Chart');
        });
    });

    describe('Canvas Setup', () => {
        test('should setup canvas when connected', () => {
            mockChart.connectedCallback();
            expect(mockChart.canvas).toBeTruthy();
        });

        test('should handle canvas context creation', () => {
            mockChart.connectedCallback();
            expect(mockChart.ctx).toBeTruthy();
        });
    });

    describe('Chart Drawing', () => {
        test('should draw bar chart when type is bar', () => {
            const chartData = {
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
            const chartData = {
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
    });

    describe('Custom Element Registration', () => {
        test('should register chart-component custom element', () => {
            // Import should trigger customElements.define
            require('../src/js/script');

            expect(mockCustomElements.define).toHaveBeenCalledWith(
                'chart-component',
                expect.any(Function)
            );
        });
    });
});