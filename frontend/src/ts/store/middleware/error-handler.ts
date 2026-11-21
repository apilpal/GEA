import { Middleware, BaseAction } from '@/ts/types/store';

/**
 * Error handler function type
 */
export type ErrorHandler<TState = any, TAction extends BaseAction = BaseAction> = (
    error: Error,
    store: { getState: () => TState; dispatch: (action: TAction) => TAction },
    action: TAction,
    retries: number
) => void | Promise<void>;

/**
 * Configuration for error handler middleware
 */
export interface ErrorHandlerConfig<TState = any, TAction extends BaseAction = BaseAction> {
    /** Custom error handler function */
    errorHandler?: ErrorHandler<TState, TAction>;
    /** Whether to re-throw errors after handling (default: false) */
    reThrow?: boolean;
    /** Maximum number of retries for failed actions (default: 0) */
    maxRetries?: number;
    /** Delay between retries in milliseconds (default: 1000) */
    retryDelay?: number;
    /** Action types to ignore for error handling */
    ignoreActions?: string[];
    /** Predicate to determine if an action should trigger error handling */
    shouldHandleError?: (action: TAction, error: Error) => boolean;
}

/**
 * Default error handler that logs errors to console
 */
const defaultErrorHandler: ErrorHandler = (error, store, action, retries) => {
    console.error('Store Error Handler:', {
        action: action.type,
        error: error.message,
        stack: error.stack,
        retries,
        state: store.getState()
    });
};

/**
 * Creates an error handling middleware
 */
export function createErrorHandler<TState = any, TAction extends BaseAction = BaseAction>(
    config: ErrorHandlerConfig<TState, TAction> = {}
): Middleware<TState, TAction> {
    const {
        errorHandler = defaultErrorHandler,
        reThrow = false,
        maxRetries = 0,
        retryDelay = 1000,
        ignoreActions = [],
        shouldHandleError = () => true
    } = config;

    return (store) => (next) => (action: TAction) => {
        // Skip error handling for ignored actions
        if (ignoreActions.includes(action.type)) {
            return next(action);
        }

        try {
            return next(action);
        } catch (error) {
            const err = error as Error;

            // Check if error should be handled
            if (!shouldHandleError(action, err)) {
                throw err;
            }

            // Attempt retries if configured
            if (maxRetries > 0) {
                const retryAction = {
                    ...action,
                    meta: {
                        ...action.meta,
                        retryCount: (action.meta?.retryCount || 0) + 1
                    }
                };

                if (retryAction.meta.retryCount <= maxRetries) {
                    // Wait before retrying (async but don't await in middleware chain)
                    setTimeout(() => {
                        try {
                            next(retryAction);
                        } catch (retryError) {
                            // Handle retry error
                            errorHandler(retryError as Error, store, retryAction, retryAction.meta.retryCount);
                        }
                    }, retryDelay);

                    return retryAction;
                } else {
                    // Max retries exceeded
                    errorHandler(err, store, action, retryAction.meta.retryCount);
                    if (reThrow) throw err;
                }
            } else {
                // No retries configured, just handle the error
                errorHandler(err, store, action, 0);
                if (reThrow) throw err;
            }
        }
    };
}

/**
 * Default error handler middleware instance
 */
export const errorHandler = createErrorHandler();

/**
 * Error handler that shows toast notifications
 */
export const toastErrorHandler = createErrorHandler({
    errorHandler: (error, store, action) => {
        // Dispatch a toast notification action
        store.dispatch({
            type: 'SHOW_TOAST',
            payload: {
                message: error.message,
                type: 'error',
                duration: 5000
            }
        } as any);

        // Also log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Store Error:', error);
        }
    }
});

/**
 * Error handler that integrates with error reporting services
 */
export const reportingErrorHandler = createErrorHandler({
    errorHandler: async (error, store, action, retries) => {
        // Log error details
        console.error('Reporting Error:', {
            action: action.type,
            error: error.message,
            stack: error.stack,
            retries,
            timestamp: new Date().toISOString()
        });

        // Here you could integrate with error reporting services like Sentry
        // Example:
        // await reportError(error, { action: action.type, retries });

        // Dispatch error action for UI feedback
        store.dispatch({
            type: 'GLOBAL_ERROR',
            payload: {
                message: error.message,
                action: action.type,
                timestamp: Date.now()
            }
        } as any);
    }
});

/**
 * Utility functions for error handling
 */
export const ErrorHandlerUtils = {
    /**
     * Creates an error action
     */
    createErrorAction: (type: string, error: Error, originalAction?: BaseAction) => ({
        type,
        payload: error,
        error: true,
        meta: {
            originalAction,
            timestamp: Date.now()
        }
    }),

    /**
     * Creates a retry action
     */
    createRetryAction: (originalAction: BaseAction, retryCount: number) => ({
        ...originalAction,
        meta: {
            ...originalAction.meta,
            retryCount,
            isRetry: true
        }
    }),

    /**
     * Checks if an action is an error action
     */
    isErrorAction: (action: BaseAction): boolean => {
        return action.error === true;
    },

    /**
     * Checks if an action is a retry action
     */
    isRetryAction: (action: BaseAction): boolean => {
        return action.meta?.isRetry === true;
    },

    /**
     * Gets retry count from action metadata
     */
    getRetryCount: (action: BaseAction): number => {
        return action.meta?.retryCount || 0;
    }
};

/**
 * Common error handling patterns
 */
export const CommonErrorHandlers = {
    /**
     * Error handler for API calls
     */
    apiErrorHandler: (error: Error, store: any, action: BaseAction) => {
        const errorMessage = error.message || 'An API error occurred';

        // Dispatch error notification
        store.dispatch({
            type: 'API_ERROR',
            payload: {
                message: errorMessage,
                action: action.type,
                status: (error as any).status,
                timestamp: Date.now()
            }
        });
    },

    /**
     * Error handler for form submissions
     */
    formErrorHandler: (error: Error, store: any, action: BaseAction) => {
        // Dispatch form error
        store.dispatch({
            type: 'FORM_ERROR',
            payload: {
                message: error.message,
                form: action.meta?.form,
                timestamp: Date.now()
            }
        });
    },

    /**
     * Error handler for authentication errors
     */
    authErrorHandler: (error: Error, store: any, action: BaseAction) => {
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            // Dispatch logout action for auth errors
            store.dispatch({ type: 'AUTH_LOGOUT' });

            // Show auth error message
            store.dispatch({
                type: 'SHOW_TOAST',
                payload: {
                    message: 'Your session has expired. Please log in again.',
                    type: 'error',
                    duration: 5000
                }
            } as any);
        } else {
            // Handle other auth errors
            store.dispatch({
                type: 'AUTH_ERROR',
                payload: {
                    message: error.message,
                    timestamp: Date.now()
                }
            });
        }
    }
};