import { BaseComponent } from '@/ts/components/core/index';
import type { ChartData } from './types';
declare class ChartComponent extends BaseComponent {
    private data;
    private canvas;
    private ctx;
    getChartData(): ChartData | null;
    getDataSummary(): string;
    exportAsCSV(): string;
    constructor();
    connectedCallback(): void;
    setData(data: ChartData): void;
    protected render(): void;
    private generateChartDescription;
    private setupHelpButton;
    protected setupEventListeners(): void;
    private setupAccessibilityListeners;
    private setupCanvas;
    private resizeCanvas;
    private updateAccessibilityElements;
    private generateDataTable;
    private generateValueDescription;
    private setupKeyboardNavigation;
    private announceHelp;
    private calculatePercentage;
    private drawChart;
    private drawBarChart;
    private drawPieChart;
}
export { ChartComponent };
export type { ChartData };
//# sourceMappingURL=chart-component.d.ts.map