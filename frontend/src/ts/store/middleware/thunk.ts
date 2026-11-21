import { Middleware, BaseAction, Dispatch, MiddlewareAPI } from '@/ts/types/store';

/**
 * Thunk action type that can dispatch actions and access state
 */
export type ThunkAction<TState = any, TExtra = any, TReturn = any> = (
    dispatch: Dispatch<BaseAction>,
    getState: () => TState,
    extra: TExtra
) => TReturn;

/**
 * Enhanced dispatch function that can handle thunk actions
 */
export type ThunkDispatch<TState = any, TExtra = any, TAction extends BaseAction = BaseAction> = (
    action: TAction | ThunkAction<TState, TExtra>
) => any;

/**
 * Configuration for thunk middleware
 */
export interface ThunkConfig<TState = any, TExtra = any> {
    extraArgument?: TExtra;
}

/**
 * Creates a thunk middleware for handling async actions
 */
export function createThunk<TState = any, TExtra = any>(
    config: ThunkConfig<TState, TExtra> = {}
): Middleware<TState, BaseAction, TExtra> {
    const { extraArgument } = config;

    return (store: MiddlewareAPI<TState, BaseAction, TExtra>) => {
        return (next: Dispatch<BaseAction>) => {
            return (action: BaseAction | ThunkAction<TState, TExtra>) => {
                // If it's a regular action, pass it through
                if (typeof action === 'object' && action.type) {
                    return next(action);
                }

                // If it's a thunk function, call it with dispatch, getState, and extra argument
                if (typeof action === 'function') {
                    return action(
                        store.dispatch as ThunkDispatch<TState, TExtra>,
                        store.getState,
                        extraArgument
                    );
                }

                // Unknown action type
                throw new Error(`Unknown action type: ${typeof action}`);
            };
        };
    };
}

/**
 * Default thunk middleware instance
 */
export const thunk = createThunk();

/**
 * Helper function to create thunk actions
 */
export function createThunkAction<TState = any, TExtra = any, TReturn = any>(
    thunkFn: ThunkAction<TState, TExtra, TReturn>
): ThunkAction<TState, TExtra, TReturn> {
    return thunkFn;
}

/**
 * Utility functions for common async patterns
 */
export const ThunkUtils = {
    /**
     * Creates a thunk that dispatches request/success/failure actions
     */
    createAsyncThunk: <TArgs extends any[], TResponse, TState = any>(
        asyncFn: (...args: TArgs) => Promise<TResponse>,
        actions: {
            request: (...args: TArgs) => BaseAction;
            success: (response: TResponse) => BaseAction;
            failure: (error: Error) => BaseAction;
        }
    ) => {
        return (...args: TArgs): ThunkAction<TState> => {
            return async (dispatch) => {
                try {
                    dispatch(actions.request(...args));
                    const response = await asyncFn(...args);
                    dispatch(actions.success(response));
                    return response;
                } catch (error) {
                    dispatch(actions.failure(error as Error));
                    throw error;
                }
            };
        };
    },

    /**
     * Creates a thunk that handles API calls with loading states
     */
    createApiThunk: <TArgs extends any[], TResponse, TState = any>(
        apiCall: (...args: TArgs) => Promise<TResponse>,
        actionCreators: {
            request: (...args: TArgs) => BaseAction;
            success: (data: TResponse) => BaseAction;
            failure: (error: Error) => BaseAction;
        }
    ) => {
        return ThunkUtils.createAsyncThunk(apiCall, actionCreators);
    },

    /**
     * Creates a thunk that dispatches an action after a delay
     */
    delay: <TAction extends BaseAction>(
        action: TAction,
        delayMs: number
    ): ThunkAction => {
        return async (dispatch) => {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            dispatch(action);
        };
    },

    /**
     * Creates a thunk that dispatches an action conditionally based on state
     */
    conditional: <TState, TAction extends BaseAction>(
        condition: (state: TState) => boolean,
        action: TAction,
        fallbackAction?: BaseAction
    ): ThunkAction<TState> => {
        return (dispatch, getState) => {
            if (condition(getState())) {
                dispatch(action);
            } else if (fallbackAction) {
                dispatch(fallbackAction);
            }
        };
    },

    /**
     * Creates a thunk that retries an async operation on failure
     */
    retry: <TArgs extends any[], TResponse, TState = any>(
        asyncFn: (...args: TArgs) => Promise<TResponse>,
        maxRetries: number = 3,
        delayMs: number = 1000
    ) => {
        return (...args: TArgs): ThunkAction<TState, any, Promise<TResponse>> => {
            return async (dispatch) => {
                let lastError: Error;

                for (let attempt = 0; attempt <= maxRetries; attempt++) {
                    try {
                        return await asyncFn(...args);
                    } catch (error) {
                        lastError = error as Error;

                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                        }
                    }
                }

                throw lastError!;
            };
        };
    }
};

/**
 * Common thunk action creators for typical patterns
 */
export const CommonThunks = {
    /**
     * Creates a thunk that fetches data from an API
     */
    fetchData: <TResponse, TState = any>(
        apiCall: () => Promise<TResponse>,
        actions: {
            request: () => BaseAction;
            success: (data: TResponse) => BaseAction;
            failure: (error: Error) => BaseAction;
        }
    ): ThunkAction<TState> => {
        return async (dispatch) => {
            try {
                dispatch(actions.request());
                const data = await apiCall();
                dispatch(actions.success(data));
            } catch (error) {
                dispatch(actions.failure(error as Error));
            }
        };
    },

    /**
     * Creates a thunk that submits form data
     */
    submitForm: <TFormData, TResponse, TState = any>(
        formData: TFormData,
        submitFn: (data: TFormData) => Promise<TResponse>,
        actions: {
            request: (data: TFormData) => BaseAction;
            success: (response: TResponse) => BaseAction;
            failure: (error: Error) => BaseAction;
        }
    ): ThunkAction<TState> => {
        return async (dispatch) => {
            try {
                dispatch(actions.request(formData));
                const response = await submitFn(formData);
                dispatch(actions.success(response));
            } catch (error) {
                dispatch(actions.failure(error as Error));
            }
        };
    },

    /**
     * Creates a thunk that handles debounced actions
     */
    debounce: <TAction extends BaseAction>(
        action: TAction,
        delayMs: number
    ): ThunkAction => {
        return async (dispatch) => {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            dispatch(action);
        };
    }
};