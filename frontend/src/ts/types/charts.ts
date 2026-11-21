export interface ChartData {
    labels: string[];
    values: number[];
    colors?: string[];
    type: 'bar' | 'pie';
    title?: string;
}