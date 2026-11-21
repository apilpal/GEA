import { Middleware, BaseAction } from '@/ts/types/store';

/**
 * Configuration options for the logger middleware
 */
export interface LoggerConfig {
    /** Whether to log actions (default: true) */
    logActions?: boolean;
    /** Whether to log state changes (default: true) */
    logState?: boolean;
    /** Whether to log errors (default: true) */
    logErrors?: boolean;
    /** Whether to collapse action logs by default (default: true) */
    collapsed?: boolean;
    /** Custom logger function (default: console) */
    logger?: {
        log: (message?: any, ...optionalParams: any[]) => void;
        group: (groupTitle?: string) => void;
        groupEnd: () => void;
        error: (message?: any, ...optionalParams: any[]) => void;
    };
    /** Action types to ignore */
    ignoreActions?: string[];
    /** Custom action transformer */
    actionTransformer?: (action: BaseAction) => any;
    /** Custom state transformer */
    stateTransformer?: (state: any) => any;
}

/**
 * Default configuration for logger middleware
 */
const defaultConfig: LoggerConfig = {
    logActions: true,
    logState: true,
    logErrors: true,
    collapsed: true,
    logger: console,
    ignoreActions: [],
    actionTransformer: (action) => action,
    stateTransformer: (state) => state
};

/**
 * Creates a Redux logger middleware with TypeScript support
 */
export function createLogger<TState = any>(config: LoggerConfig = {}): Middleware<TState> {
    const mergedConfig = { ...defaultConfig, ...config };
    const { logger } = mergedConfig;

    return (store) => (next) => (action: BaseAction) => {
        const prevState = store.getState();
        const started = performance.now();

        // Log action
        if (mergedConfig.logActions && !mergedConfig.ignoreActions?.includes(action.type)) {
            if (mergedConfig.collapsed) {
                logger.group(`action ${action.type}`);
            } else {
                logger.log('action', action.type);
            }

            if (mergedConfig.actionTransformer) {
                logger.log('Action:', mergedConfig.actionTransformer(action));
            } else {
                logger.log('Action:', action);
            }

            if (mergedConfig.collapsed) {
                logger.groupEnd();
            }
        }

        // Dispatch the action
        let result: BaseAction;
        try {
            result = next(action);
        } catch (error) {
            // Log error
            if (mergedConfig.logErrors) {
                logger.error('Error in action:', action.type, error);
            }
            throw error;
        }

        const afterState = store.getState();
        const took = performance.now() - started;

        // Log state change
        if (mergedConfig.logState && !mergedConfig.ignoreActions?.includes(action.type)) {
            if (mergedConfig.collapsed) {
                logger.group(`state after ${action.type} (${took.toFixed(2)}ms)`);
            } else {
                logger.log('state after', action.type, `(${took.toFixed(2)}ms)`);
            }

            if (mergedConfig.stateTransformer) {
                logger.log('Prev State:', mergedConfig.stateTransformer(prevState));
                logger.log('Next State:', mergedConfig.stateTransformer(afterState));
            } else {
                logger.log('Prev State:', prevState);
                logger.log('Next State:', afterState);
            }

            if (mergedConfig.collapsed) {
                logger.groupEnd();
            }
        }

        return result;
    };
}

/**
 * Pre-configured logger middleware instances
 */
export const logger = createLogger();

/**
 * Development logger with more verbose output
 */
export const devLogger = createLogger({
    collapsed: false,
    logActions: true,
    logState: true,
    logErrors: true
});

/**
 * Production logger that only logs errors
 */
export const prodLogger = createLogger({
    logActions: false,
    logState: false,
    logErrors: true
});