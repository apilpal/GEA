// Chart-related types

/**
 * Interface defining the data structure for chart components.
 * Supports both bar and pie chart visualizations with customizable styling.
 */
export interface ChartData {
    /** Array of label strings for the chart axes or legend */
    labels: string[];
    /** Array of numeric values corresponding to each label */
    values: number[];
    /** Optional array of color strings for chart elements */
    colors?: string[];
    /** Chart visualization type - either bar or pie chart */
    type: 'bar' | 'pie';
    /** Optional title for the chart */
    title?: string;
}