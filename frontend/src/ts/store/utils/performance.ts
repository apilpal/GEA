import { Selector, BaseAction, Store } from '@/ts/types/store';

/**
 * Performance monitoring for Redux stores
 */
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

/**
 * Performance monitor class
 */
export class StorePerformanceMonitor<TState = any, TAction extends BaseAction = BaseAction> {
    private metrics: PerformanceMetrics = {
        actionCount: 0,
        totalTime: 0,
        averageTime: 0,
        slowestAction: { type: '', time: 0, timestamp: 0 },
        fastestAction: { type: '', time: Infinity, timestamp: 0 },
        actionTimes: new Map()
    };

    private isEnabled: boolean = false;
    private startTime: number = 0;

    /**
     * Enable performance monitoring
     */
    enable(): void {
        this.isEnabled = true;
    }

    /**
     * Disable performance monitoring
     */
    disable(): void {
        this.isEnabled = false;
    }

    /**
     * Start timing an action
     */
    startTiming(action: TAction): void {
        if (!this.isEnabled) return;
        this.startTime = performance.now();
    }

    /**
     * End timing an action and record metrics
     */
    endTiming(action: TAction): void {
        if (!this.isEnabled || this.startTime === 0) return;

        const endTime = performance.now();
        const duration = endTime - this.startTime;
        this.startTime = 0;

        this.recordActionTime(action.type, duration);
    }

    private recordActionTime(actionType: string, duration: number): void {
        // Update global metrics
        this.metrics.actionCount++;
        this.metrics.totalTime += duration;
        this.metrics.averageTime = this.metrics.totalTime / this.metrics.actionCount;

        // Update slowest action
        if (duration > this.metrics.slowestAction.time) {
            this.metrics.slowestAction = {
                type: actionType,
                time: duration,
                timestamp: Date.now()
            };
        }

        // Update fastest action
        if (duration < this.metrics.fastestAction.time) {
            this.metrics.fastestAction = {
                type: actionType,
                time: duration,
                timestamp: Date.now()
            };
        }

        // Record action-specific metrics
        if (!this.metrics.actionTimes.has(actionType)) {
            this.metrics.actionTimes.set(actionType, []);
        }
        this.metrics.actionTimes.get(actionType)!.push(duration);
    }

    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Get average time for a specific action type
     */
    getAverageTimeForAction(actionType: string): number {
        const times = this.metrics.actionTimes.get(actionType);
        if (!times || times.length === 0) return 0;
        return times.reduce((sum, time) => sum + time, 0) / times.length;
    }

    /**
     * Get action count for a specific action type
     */
    getActionCount(actionType: string): number {
        const times = this.metrics.actionTimes.get(actionType);
        return times ? times.length : 0;
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.metrics = {
            actionCount: 0,
            totalTime: 0,
            averageTime: 0,
            slowestAction: { type: '', time: 0, timestamp: 0 },
            fastestAction: { type: '', time: Infinity, timestamp: 0 },
            actionTimes: new Map()
        };
    }

    /**
     * Generate performance report
     */
    generateReport(): string {
        const metrics = this.getMetrics();
        const report = [
            '=== Redux Store Performance Report ===',
            `Total Actions: ${metrics.actionCount}`,
            `Average Time: ${metrics.averageTime.toFixed(2)}ms`,
            `Total Time: ${metrics.totalTime.toFixed(2)}ms`,
            '',
            'Slowest Action:',
            `  Type: ${metrics.slowestAction.type}`,
            `  Time: ${metrics.slowestAction.time.toFixed(2)}ms`,
            '',
            'Fastest Action:',
            `  Type: ${metrics.fastestAction.type}`,
            `  Time: ${metrics.fastestAction.time.toFixed(2)}ms`,
            '',
            'Action Breakdown:'
        ];

        for (const [actionType, times] of metrics.actionTimes.entries()) {
            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const count = times.length;
            report.push(`  ${actionType}: ${count} calls, avg: ${avgTime.toFixed(2)}ms`);
        }

        return report.join('\n');
    }
}

/**
 * Performance-optimized selector creator
 */
export function createOptimizedSelector<TState, TResult>(
    inputSelectors: Array<Selector<TState, any>>,
    resultFn: (...args: any[]) => TResult,
    options: {
        memoize?: boolean;
        maxCacheSize?: number;
        equalityCheck?: (a: TResult, b: TResult) => boolean;
    } = {}
): Selector<TState, TResult> {
    const {
        memoize = true,
        maxCacheSize = 100,
        equalityCheck = (a, b) => a === b
    } = options;

    if (!memoize) {
        return (state: TState): TResult => {
            const inputs = inputSelectors.map(selector => selector(state));
            return resultFn(...inputs);
        };
    }

    const cache = new Map<string, TResult>();
    let cacheOrder: string[] = [];

    return (state: TState): TResult => {
        const inputs = inputSelectors.map(selector => selector(state));
        const key = JSON.stringify(inputs);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = resultFn(...inputs);

        // Manage cache size
        if (cache.size >= maxCacheSize) {
            const oldestKey = cacheOrder.shift()!;
            cache.delete(oldestKey);
        }

        cache.set(key, result);
        cacheOrder.push(key);

        return result;
    };
}

/**
 * Batch actions to reduce store updates
 */
export class ActionBatcher {
    private pendingActions: BaseAction[] = [];
    private batchTimeout: NodeJS.Timeout | null = null;
    private batchDelay: number;
    private store: Store<any, BaseAction>;

    constructor(store: Store<any, BaseAction>, batchDelay: number = 0) {
        this.store = store;
        this.batchDelay = batchDelay;
    }

    /**
     * Add an action to the batch
     */
    add(action: BaseAction): void {
        this.pendingActions.push(action);

        if (this.batchDelay === 0) {
            this.flush();
        } else if (!this.batchTimeout) {
            this.batchTimeout = setTimeout(() => {
                this.flush();
            }, this.batchDelay);
        }
    }

    /**
     * Flush all pending actions
     */
    flush(): void {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        if (this.pendingActions.length > 0) {
            // Dispatch actions in batch
            const batchedAction: BaseAction = {
                type: '@@BATCH_ACTIONS',
                payload: this.pendingActions
            };

            this.store.dispatch(batchedAction);
            this.pendingActions = [];
        }
    }

    /**
     * Cancel all pending actions
     */
    cancel(): void {
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
        this.pendingActions = [];
    }

    /**
     * Get pending action count
     */
    getPendingCount(): number {
        return this.pendingActions.length;
    }
}

/**
 * Debounce selector calls for expensive computations
 */
export function createDebouncedSelector<TState, TResult>(
    selector: Selector<TState, TResult>,
    delay: number,
    options: {
        immediate?: boolean;
        maxWait?: number;
    } = {}
): Selector<TState, TResult> & {
    flush(): TResult | undefined;
    cancel(): void;
} {
    const { immediate = false, maxWait } = options;

    let timeoutId: NodeJS.Timeout | null = null;
    let maxWaitTimeoutId: NodeJS.Timeout | null = null;
    let lastResult: TResult | undefined;
    let lastArgs: TState | undefined;
    let pendingArgs: TState | undefined;

    const debouncedSelector = (state: TState): TResult => {
        pendingArgs = state;

        if (immediate && lastArgs === undefined) {
            lastResult = selector(state);
            lastArgs = state;
            return lastResult;
        }

        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            if (pendingArgs !== undefined) {
                lastResult = selector(pendingArgs);
                lastArgs = pendingArgs;
                pendingArgs = undefined;
            }
            timeoutId = null;
        }, delay);

        if (maxWait && !maxWaitTimeoutId) {
            maxWaitTimeoutId = setTimeout(() => {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (pendingArgs !== undefined) {
                    lastResult = selector(pendingArgs);
                    lastArgs = pendingArgs;
                    pendingArgs = undefined;
                }
            }, maxWait);
        }

        return lastResult as TResult;
    };

    return Object.assign(debouncedSelector, {
        flush(): TResult | undefined {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (maxWaitTimeoutId !== null) {
                clearTimeout(maxWaitTimeoutId);
                maxWaitTimeoutId = null;
            }

            if (pendingArgs !== undefined) {
                lastResult = selector(pendingArgs);
                lastArgs = pendingArgs;
                pendingArgs = undefined;
            }

            return lastResult;
        },
        cancel(): void {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (maxWaitTimeoutId !== null) {
                clearTimeout(maxWaitTimeoutId);
                maxWaitTimeoutId = null;
            }
            pendingArgs = undefined;
        }
    });
}

/**
 * Performance utilities
 */
export const PerformanceUtils = {
    /**
     * Measures the execution time of a function
     */
    measureExecution: <TArgs extends any[], TResult>(
        fn: (...args: TArgs) => TResult
    ) => {
        return (...args: TArgs): TResult => {
            const start = performance.now();
            const result = fn(...args);
            const end = performance.now();
            console.log(`Execution time: ${end - start}ms`);
            return result;
        };
    },

    /**
     * Creates a performance-marked version of a selector
     */
    withPerformanceMarks: <TState, TResult>(
        selector: Selector<TState, TResult>,
        name: string
    ): Selector<TState, TResult> => {
        return (state: TState): TResult => {
            performance.mark(`${name}-start`);
            const result = selector(state);
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
            return result;
        };
    },

    /**
     * Creates a memory usage monitor
     */
    createMemoryMonitor: () => {
        const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

        return {
            getMemoryUsage: (): number => {
                return (performance as any).memory?.usedJSHeapSize || 0;
            },
            getMemoryDelta: (): number => {
                return ((performance as any).memory?.usedJSHeapSize || 0) - initialMemory;
            },
            formatBytes: (bytes: number): string => {
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                if (bytes === 0) return '0 Bytes';
                const i = Math.floor(Math.log(bytes) / Math.log(1024));
                return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
            }
        };
    }
};