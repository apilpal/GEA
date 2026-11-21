import { Selector, BaseAction, Store } from '@/ts/types/store';
export interface PerformanceMetrics {
    actionCount: number;
    totalTime: number;
    averageTime: number;
    slowestAction: {
        type: string;
        time: number;
        timestamp: number;
    };
    fastestAction: {
        type: string;
        time: number;
        timestamp: number;
    };
    actionTimes: Map<string, number[]>;
}
export declare class StorePerformanceMonitor<TState = any, TAction extends BaseAction = BaseAction> {
    private metrics;
    private isEnabled;
    private startTime;
    enable(): void;
    disable(): void;
    startTiming(action: TAction): void;
    endTiming(action: TAction): void;
    private recordActionTime;
    getMetrics(): PerformanceMetrics;
    getAverageTimeForAction(actionType: string): number;
    getActionCount(actionType: string): number;
    reset(): void;
    generateReport(): string;
}
export declare function createOptimizedSelector<TState, TResult>(inputSelectors: Array<Selector<TState, any>>, resultFn: (...args: any[]) => TResult, options?: {
    memoize?: boolean;
    maxCacheSize?: number;
    equalityCheck?: (a: TResult, b: TResult) => boolean;
}): Selector<TState, TResult>;
export declare class ActionBatcher {
    private pendingActions;
    private batchTimeout;
    private batchDelay;
    private store;
    constructor(store: Store<any, BaseAction>, batchDelay?: number);
    add(action: BaseAction): void;
    flush(): void;
    cancel(): void;
    getPendingCount(): number;
}
export declare function createDebouncedSelector<TState, TResult>(selector: Selector<TState, TResult>, delay: number, options?: {
    immediate?: boolean;
    maxWait?: number;
}): Selector<TState, TResult> & {
    flush(): TResult | undefined;
    cancel(): void;
};
export declare const PerformanceUtils: {
    measureExecution: <TArgs extends any[], TResult>(fn: (...args: TArgs) => TResult) => (...args: TArgs) => TResult;
    withPerformanceMarks: <TState, TResult>(selector: Selector<TState, TResult>, name: string) => Selector<TState, TResult>;
    createMemoryMonitor: () => {
        getMemoryUsage: () => number;
        getMemoryDelta: () => number;
        formatBytes: (bytes: number) => string;
    };
};
//# sourceMappingURL=performance.d.ts.map