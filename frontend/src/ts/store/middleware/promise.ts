import { Middleware, BaseAction } from '@/ts/types/store';

/**
 * Configuration for promise middleware
 */
export interface PromiseConfig {
    /** Whether to dispatch promise actions globally (default: false) */
    global?: boolean;
    /** Custom suffixes for promise actions (default: REQUEST, SUCCESS, FAILURE) */
    suffixes?: {
        request?: string;
        success?: string;
        failure?: string;
    };
    /** Custom promise type identifier (default: 'promise') */
    promiseType?: string | symbol;
}

/**
 * Default configuration for promise middleware
 */
const defaultConfig: PromiseConfig = {
    global: false,
    suffixes: {
        request: 'REQUEST',
        success: 'SUCCESS',
        failure: 'FAILURE'
    },
    promiseType: 'promise'
};

/**
 * Creates a promise middleware for handling promises in actions
 */
export function createPromise<TState = any>(config: PromiseConfig = {}): Middleware<TState> {
    const mergedConfig = { ...defaultConfig, ...config };
    const { suffixes, promiseType } = mergedConfig;

    return () => (next) => (action: BaseAction) => {
        // Check if action contains a promise
        if (!action || typeof action !== 'object' || !(action as any)[promiseType]) {
            return next(action);
        }

        const promise = (action as any)[promiseType];
        const { type } = action;

        // Create action types for promise states
        const requestType = `${type}_${suffixes!.request}`;
        const successType = `${type}_${suffixes!.success}`;
        const failureType = `${type}_${suffixes!.failure}`;

        // Dispatch request action
        next({ ...action, type: requestType });

        // Handle the promise
        return promise
            .then((result: any) => {
                // Dispatch success action
                next({
                    ...action,
                    type: successType,
                    payload: result,
                    meta: {
                        ...action.meta,
                        promiseResult: result
                    }
                });
                return result;
            })
            .catch((error: Error) => {
                // Dispatch failure action
                next({
                    ...action,
                    type: failureType,
                    payload: error,
                    error: true,
                    meta: {
                        ...action.meta,
                        promiseError: error
                    }
                });
                throw error;
            });
    };
}

/**
 * Default promise middleware instance
 */
export const promise = createPromise();

/**
 * Helper function to create promise actions
 */
export function createPromiseAction<T = any>(
    type: string,
    promise: Promise<T>,
    meta?: Record<string, any>
): BaseAction & { promise: Promise<T> } {
    return {
        type,
        promise,
        meta
    };
}

/**
 * Utility functions for promise middleware
 */
export const PromiseUtils = {
    /**
     * Creates a promise action creator
     */
    actionCreator: <TArgs extends any[], T = any>(
        type: string,
        promiseFn: (...args: TArgs) => Promise<T>
    ) => {
        return (...args: TArgs) => createPromiseAction(type, promiseFn(...args));
    },

    /**
     * Wraps a promise-returning function to work with promise middleware
     */
    wrapPromise: <T extends any[], R>(
        fn: (...args: T) => Promise<R>
    ) => {
        return (...args: T): BaseAction & { promise: Promise<R> } => ({
            type: fn.name || 'PROMISE_ACTION',
            promise: fn(...args)
        });
    },

    /**
     * Creates a promise action with custom metadata
     */
    withMeta: <T = any>(
        type: string,
        promise: Promise<T>,
        meta: Record<string, any>
    ) => createPromiseAction(type, promise, meta)
};

/**
 * Common promise action patterns
 */
export const PromiseActions = {
    /**
     * Creates API call promise actions
     */
    apiCall: <TArgs extends any[], TResponse = any>(
        baseType: string,
        apiFn: (...args: TArgs) => Promise<TResponse>
    ) => {
        return (...args: TArgs) => ({
            type: baseType,
            promise: apiFn(...args)
        });
    },

    /**
     * Creates form submission promise actions
     */
    submitForm: <TFormData, TResponse = any>(
        formData: TFormData,
        submitFn: (data: TFormData) => Promise<TResponse>
    ) => ({
        type: 'SUBMIT_FORM',
        promise: submitFn(formData),
        meta: { formData }
    }),

    /**
     * Creates data fetch promise actions
     */
    fetchData: <TParams = any, TResponse = any>(
        params: TParams,
        fetchFn: (params: TParams) => Promise<TResponse>
    ) => ({
        type: 'FETCH_DATA',
        promise: fetchFn(params),
        meta: { params }
    })
};