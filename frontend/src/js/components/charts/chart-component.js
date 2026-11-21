import { BaseComponent } from '@/ts/components/core/index';
class ChartComponent extends BaseComponent {
    getChartData() {
        return this.data;
    }
    getDataSummary() {
        if (!this.data)
            return 'No data available';
        const { labels, values, title, type } = this.data;
        let summary = `${title || 'Chart'} (${type} chart):\n`;
        labels.forEach((label, index) => {
            summary += `${label}: ${values[index]}\n`;
        });
        return summary.trim();
    }
    exportAsCSV() {
        if (!this.data)
            return '';
        let csv = 'Label,Value\n';
        this.data.labels.forEach((label, index) => {
            csv += `"${label}",${this.data.values[index]}\n`;
        });
        return csv;
    }
    constructor() {
        super();
        this.data = null;
        this.canvas = null;
        this.ctx = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this.setupCanvas();
    }
    setData(data) {
        if (this.data === data || (this.data && data && JSON.stringify(this.data) === JSON.stringify(data))) {
            return;
        }
        this.data = data;
        this.markForRender();
        this.drawChart();
        this.updateAccessibilityElements();
    }
    render() {
        const shadow = this.shadowRoot;
        const title = this.data?.title || 'Chart';
        const type = this.data?.type || 'chart';
        const description = this.generateChartDescription();
        shadow.innerHTML = `
            <div class="chart-container" role="application" aria-label="${title} ${type} chart application">
                <div class="chart-header">
                    <h3 id="chart-title">${title}</h3>
                    <button
                        id="chart-help-btn"
                        class="chart-help-btn"
                        aria-label="Show chart navigation help"
                        aria-describedby="chart-help-btn"
                        aria-expanded="false"
                    >
                        <icon-question size="16"></icon-question>
                        <span class="sr-only">Help</span>
                    </button>
                </div>
                <div class="chart-content">
                    <canvas
                        id="chart-canvas"
                        class="chart-canvas"
                        role="img"
                        aria-label="${title} ${type} chart visualization"
                        aria-describedby="chart-description chart-data-table"
                        aria-details="chart-data-table"
                        tabindex="0"
                    ></canvas>
                    <div id="chart-description" class="sr-only">${description}</div>
                </div>
                <div id="chart-data-table" class="sr-only" role="region" aria-label="Chart data table"></div>
                <div
                    id="chart-announcer"
                    aria-live="polite"
                    aria-atomic="true"
                    class="sr-only"
                    role="status"
                    aria-label="Chart announcements"
                ></div>
                <div id="chart-help" class="sr-only" role="tooltip" aria-hidden="true">
                    Use arrow keys to navigate data points. Press Enter or Space to announce current point.
                    Press H for help, Escape to return to overview.
                </div>
            </div>
        `;
        this.setupCanvas();
        this.setupHelpButton();
        this.updateAccessibilityElements();
    }
    generateChartDescription() {
        if (!this.data)
            return 'Interactive chart with no data loaded.';
        const { labels, values, title, type } = this.data;
        const total = values.reduce((sum, value) => sum + value, 0);
        const dataPoints = labels.length;
        let description = `${title || 'Chart'} is a ${type} chart displaying ${dataPoints} data points. `;
        if (type === 'pie') {
            description += 'Each segment represents a portion of the whole. ';
            const largestSegment = Math.max(...values);
            const largestIndex = values.indexOf(largestSegment);
            if (largestIndex >= 0) {
                const percentage = ((largestSegment / total) * 100).toFixed(1);
                description += `${labels[largestIndex]} is the largest segment at ${percentage}%. `;
            }
        }
        else {
            description += 'Values are represented as bars. ';
            const maxValue = Math.max(...values);
            const minValue = Math.min(...values);
            description += `The highest value is ${maxValue} and the lowest is ${minValue}. `;
        }
        description += 'Use keyboard navigation to explore individual data points.';
        return description;
    }
    setupHelpButton() {
        const shadow = this.shadowRoot;
        const helpButton = shadow.querySelector('#chart-help-btn');
        const helpContent = shadow.querySelector('#chart-help');
        if (helpButton && helpContent) {
            helpButton.addEventListener('click', () => {
                const isExpanded = helpButton.getAttribute('aria-expanded') === 'true';
                const newExpanded = !isExpanded;
                helpButton.setAttribute('aria-expanded', newExpanded.toString());
                helpContent.setAttribute('aria-hidden', (!newExpanded).toString());
                if (newExpanded) {
                    this.announceHelp();
                }
            });
            helpButton.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    helpButton.setAttribute('aria-expanded', 'false');
                    helpContent.setAttribute('aria-hidden', 'true');
                }
            });
        }
    }
    setupEventListeners() {
        this.setupCanvas();
        this.setupAccessibilityListeners();
    }
    setupAccessibilityListeners() {
        if (this.canvas) {
            this.canvas.focus();
        }
    }
    setupCanvas() {
        const shadow = this.shadowRoot;
        this.canvas = shadow.querySelector('.chart-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
        }
    }
    resizeCanvas() {
        if (!this.canvas)
            return;
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }
    }
    updateAccessibilityElements() {
        if (!this.data)
            return;
        const shadow = this.shadowRoot;
        const dataTable = shadow.querySelector('#chart-data-table');
        const announcer = shadow.querySelector('#chart-announcer');
        if (dataTable) {
            dataTable.innerHTML = this.generateDataTable();
        }
        if (this.canvas) {
            this.setupKeyboardNavigation();
        }
        if (announcer) {
            announcer.textContent = `${this.data.title || 'Chart'} updated with ${this.data.labels.length} data points.`;
        }
    }
    generateDataTable() {
        if (!this.data)
            return '';
        const { labels, values, title, type } = this.data;
        const total = values.reduce((sum, value) => sum + value, 0);
        let tableHTML = `
            <table
                role="table"
                aria-label="${title || 'Chart'} data table - ${type} chart"
                aria-rowcount="${labels.length + 1}"
                aria-colcount="4"
                class="chart-data-table"
            >
                <caption class="sr-only">${title || 'Chart'} showing ${labels.length} data points</caption>
                <thead>
                    <tr role="row">
                        <th scope="col" role="columnheader" aria-sort="none">Category</th>
                        <th scope="col" role="columnheader" aria-sort="none">Value</th>
                        <th scope="col" role="columnheader" aria-sort="none">Percentage</th>
                        <th scope="col" role="columnheader" aria-sort="none">Description</th>
                    </tr>
                </thead>
                <tbody>
        `;
        labels.forEach((label, index) => {
            const value = values[index];
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const description = this.generateValueDescription(label, value, percentage, type);
            tableHTML += `
                <tr role="row" data-index="${index}">
                    <td role="gridcell" aria-label="Category: ${label}">${label}</td>
                    <td role="gridcell" aria-label="Value: ${value}">${value}</td>
                    <td role="gridcell" aria-label="Percentage: ${percentage} percent">${percentage}%</td>
                    <td role="gridcell" aria-label="Description: ${description}">${description}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        if (type === 'pie' && total > 0) {
            tableHTML += `
                <tfoot>
                    <tr role="row">
                        <td role="gridcell" aria-label="Total categories: ${labels.length}">Total: ${labels.length} categories</td>
                        <td role="gridcell" aria-label="Total value: ${total}">${total}</td>
                        <td role="gridcell" aria-label="Total percentage: 100 percent">100.0%</td>
                        <td role="gridcell" aria-label="Summary">Complete dataset</td>
                    </tr>
                </tfoot>
            `;
        }
        return tableHTML;
    }
    generateValueDescription(label, value, percentage, type) {
        if (type === 'pie') {
            return `${label} represents ${percentage}% of the total`;
        }
        else {
            return `${label} has a value of ${value}`;
        }
    }
    setupKeyboardNavigation() {
        if (!this.canvas || !this.data)
            return;
        const { labels, values } = this.data;
        let currentIndex = -1;
        const announceData = (index) => {
            const shadow = this.shadowRoot;
            const announcer = shadow.querySelector('#chart-announcer');
            if (announcer && index >= 0 && index < labels.length) {
                const percentage = this.calculatePercentage(index);
                announcer.textContent = `${labels[index]}: ${values[index]} (${percentage}%). ${this.generateValueDescription(labels[index], values[index], percentage, this.data.type)}`;
            }
        };
        const announceInstructions = () => {
            const shadow = this.shadowRoot;
            const announcer = shadow.querySelector('#chart-announcer');
            if (announcer) {
                announcer.textContent = `${this.data.title || 'Chart'} focused. Use arrow keys to navigate data points, Enter or Space to announce current point, H for help.`;
            }
        };
        this.canvas.addEventListener('keydown', (event) => {
            const handledKeys = [
                'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown',
                'Home', 'End', 'Enter', ' ', 'h', 'H', 'Escape'
            ];
            if (!handledKeys.includes(event.key)) {
                return;
            }
            switch (event.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    currentIndex = Math.min(currentIndex + 1, labels.length - 1);
                    announceData(currentIndex);
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    currentIndex = Math.max(currentIndex - 1, -1);
                    if (currentIndex === -1) {
                        announceInstructions();
                    }
                    else {
                        announceData(currentIndex);
                    }
                    event.preventDefault();
                    break;
                case 'Home':
                    currentIndex = 0;
                    announceData(currentIndex);
                    event.preventDefault();
                    break;
                case 'End':
                    currentIndex = labels.length - 1;
                    announceData(currentIndex);
                    event.preventDefault();
                    break;
                case 'Enter':
                case ' ':
                    if (currentIndex >= 0) {
                        announceData(currentIndex);
                    }
                    else {
                        announceInstructions();
                    }
                    event.preventDefault();
                    break;
                case 'h':
                case 'H':
                    this.announceHelp();
                    event.preventDefault();
                    break;
                case 'Escape':
                    currentIndex = -1;
                    announceInstructions();
                    event.preventDefault();
                    break;
            }
        });
        this.canvas.addEventListener('focus', () => {
            announceInstructions();
        });
        this.canvas.addEventListener('blur', () => {
            currentIndex = -1;
        });
    }
    announceHelp() {
        const shadow = this.shadowRoot;
        const announcer = shadow.querySelector('#chart-announcer');
        if (!announcer || !this.data)
            return;
        const { labels, type } = this.data;
        const helpText = `
            Chart Navigation Help: ${this.data.title || 'Chart'} is a ${type} chart with ${labels.length} data points.
            Use arrow keys to navigate between data points.
            Press Enter or Space to announce the current data point.
            Press H for this help, Escape to return to chart overview.
            Press Tab to move to next element.
        `.trim();
        announcer.textContent = helpText;
    }
    calculatePercentage(index) {
        if (!this.data)
            return '0.0';
        const { values } = this.data;
        const total = values.reduce((sum, value) => sum + value, 0);
        if (total === 0)
            return '0.0';
        return ((values[index] / total) * 100).toFixed(1);
    }
    drawChart() {
        if (!this.data || !this.ctx || !this.canvas)
            return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.data.type === 'bar') {
            this.drawBarChart();
        }
        else if (this.data.type === 'pie') {
            this.drawPieChart();
        }
    }
    drawBarChart() {
        if (!this.data || !this.ctx || !this.canvas)
            return;
        const { labels, values, colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'] } = this.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        const maxValue = Math.max(...values);
        const barWidth = chartWidth / labels.length * 0.8;
        const spacing = chartWidth / labels.length * 0.2;
        labels.forEach((label, index) => {
            const value = values[index];
            const barHeight = (value / maxValue) * chartHeight;
            const x = padding + index * (barWidth + spacing);
            const y = height - padding - barHeight;
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fillRect(x, y, barWidth, barHeight);
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, barWidth, barHeight);
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label, x + barWidth / 2, height - padding / 2);
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
        });
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, height - padding);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(padding, height - padding);
        this.ctx.lineTo(width - padding, height - padding);
        this.ctx.stroke();
    }
    drawPieChart() {
        if (!this.data || !this.ctx || !this.canvas)
            return;
        const { labels, values, colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'] } = this.data;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        const total = values.reduce((sum, value) => sum + value, 0);
        let startAngle = 0;
        labels.forEach((label, index) => {
            const value = values[index];
            const sliceAngle = (value / total) * 2 * Math.PI;
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label, labelX, labelY);
            const percentage = ((value / total) * 100).toFixed(1);
            this.ctx.fillText(`${percentage}%`, labelX, labelY + 15);
            startAngle += sliceAngle;
        });
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.3, 0, 2 * Math.PI);
        this.ctx.fill();
    }
}
export { ChartComponent };
//# sourceMappingURL=chart-component.js.map