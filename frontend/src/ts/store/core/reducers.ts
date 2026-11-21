import { BaseAction, Reducer, ActionType, PayloadType } from './types';

/**
 * Creates a reducer function with improved type safety
 */
export function createReducer<TState, TAction extends BaseAction = BaseAction>(
    initialState: TState,
    handlers: {
        [K in TAction['type']]: (
            state: TState,
            action: Extract<TAction, { type: K }>
        ) => TState;
    }
): Reducer<TState, TAction> {
    return (state: TState = initialState, action: TAction): TState => {
        const handler = handlers[action.type as TAction['type']];
        return handler ? handler(state, action as Extract<TAction, { type: TAction['type'] }>) : state;
    };
}

/**
 * Creates a typed reducer handler with payload type inference
 */
export function createHandler<TState, TActionType extends string, TPayload>(
    handler: (state: TState, payload: TPayload) => TState
) {
    return (state: TState, action: BaseAction<TActionType, TPayload>): TState => {
        return handler(state, action.payload as TPayload);
    };
}

/**
 * Creates a typed reducer handler without payload
 */
export function createSimpleHandler<TState>(
    handler: (state: TState) => TState
) {
    return (state: TState, action: BaseAction): TState => {
        return handler(state);
    };
}

/**
 * Type-safe reducer case builder
 */
export function cases<TState, TAction extends BaseAction>(
    handlers: {
        [K in TAction['type']]?: (
            state: TState,
            action: Extract<TAction, { type: K }>
        ) => TState;
    }
) {
    return handlers;
}

/**
 * Common reducer patterns
 */
export const ReducerPatterns = {
    /**
     * Set a value in state
     */
    setValue: <T>(key: keyof T) =>
        <TValue>(state: T, value: TValue): T => ({
            ...state,
            [key]: value
        }),

    /**
     * Set multiple values in state
     */
    setValues: <T>(state: T, values: Partial<T>): T => ({
        ...state,
        ...values
    }),

    /**
     * Toggle a boolean value
     */
    toggle: <T>(key: keyof T) =>
        (state: T): T => ({
            ...state,
            [key]: !state[key]
        }),

    /**
     * Add item to array
     */
    addToArray: <T>(key: keyof T) =>
        <TItem>(state: T, item: TItem): T => ({
            ...state,
            [key]: [...(state[key] as TItem[]), item]
        }),

    /**
     * Remove item from array
     */
    removeFromArray: <T>(key: keyof T) =>
        <TItem>(state: T, item: TItem): T => ({
            ...state,
            [key]: (state[key] as TItem[]).filter(i => i !== item)
        }),

    /**
     * Update item in array by id
     */
    updateInArray: <T>(key: keyof T) =>
        <TItem extends { id: string }>(state: T, id: string, updates: Partial<TItem>): T => ({
            ...state,
            [key]: (state[key] as TItem[]).map(item =>
                item.id === id ? { ...item, ...updates } : item
            )
        }),

    /**
     * Set loading state
     */
    setLoading: <T extends { loading?: boolean }>(loadingKey: keyof T = 'loading') =>
        (state: T, loading: boolean): T => ({
            ...state,
            [loadingKey]: loading
        }),

    /**
     * Set error state
     */
    setError: <T extends { error?: any }>(errorKey: keyof T = 'error') =>
        (state: T, error: any): T => ({
            ...state,
            [errorKey]: error
        }),

    /**
     * Clear error state
     */
    clearError: <T extends { error?: any }>(errorKey: keyof T = 'error') =>
        (state: T): T => ({
            ...state,
            [errorKey]: null
        }),

    /**
     * Reset state to initial
     */
    reset: <T>(initialState: T) =>
        (): T => initialState,

    /**
     * Async operation pattern
     */
    asyncOperation: <T extends { loading?: boolean; error?: any; data?: any }>(
        state: T,
        action: BaseAction,
        successCallback?: (state: T, data: any) => T
    ): T => {
        switch (action.type) {
            case action.type.includes('REQUEST') ? action.type : null:
                return {
                    ...state,
                    loading: true,
                    error: null
                };
            case action.type.includes('SUCCESS') ? action.type : null:
                return {
                    ...state,
                    loading: false,
                    error: null,
                    ...(successCallback ? successCallback(state, (action as any).payload) : { data: (action as any).payload })
                };
            case action.type.includes('FAILURE') ? action.type : null:
                return {
                    ...state,
                    loading: false,
                    error: (action as any).payload
                };
            default:
                return state;
        }
    }
};

/**
 * Advanced reducer utilities
 */
export const AdvancedReducers = {
    /**
     * Creates a reducer that handles normalized state (entities/ids pattern)
     */
    createNormalizedReducer: <TEntity extends { id: string }, TAction extends BaseAction>(
        entityName: string,
        initialState: { entities: Record<string, TEntity>; ids: string[]; loading?: boolean; error?: any }
    ) => {
        return createReducer(initialState, {
            [`${entityName}/FETCH_ALL_REQUEST`]: (state) => ({
                ...state,
                loading: true,
                error: null
            }),
            [`${entityName}/FETCH_ALL_SUCCESS`]: (state, action) => {
                const entities = (action as any).payload.reduce((acc: Record<string, TEntity>, entity: TEntity) => {
                    acc[entity.id] = entity;
                    return acc;
                }, {});

                return {
                    ...state,
                    loading: false,
                    entities,
                    ids: (action as any).payload.map((entity: TEntity) => entity.id)
                };
            },
            [`${entityName}/FETCH_ALL_FAILURE`]: (state, action) => ({
                ...state,
                loading: false,
                error: (action as any).payload
            }),
            [`${entityName}/CREATE_SUCCESS`]: (state, action) => {
                const entity = (action as any).payload as TEntity;
                return {
                    ...state,
                    entities: { ...state.entities, [entity.id]: entity },
                    ids: [...state.ids, entity.id]
                };
            },
            [`${entityName}/UPDATE_SUCCESS`]: (state, action) => {
                const entity = (action as any).payload as TEntity;
                return {
                    ...state,
                    entities: { ...state.entities, [entity.id]: entity }
                };
            },
            [`${entityName}/DELETE_SUCCESS`]: (state, action) => {
                const id = (action as any).payload as string;
                const { [id]: removed, ...remainingEntities } = state.entities;
                return {
                    ...state,
                    entities: remainingEntities,
                    ids: state.ids.filter(entityId => entityId !== id)
                };
            }
        });
    },

    /**
     * Creates a reducer for form state management
     */
    createFormReducer: <TFormData>(
        initialState: { values: TFormData; errors: Partial<Record<keyof TFormData, string>>; touched: Partial<Record<keyof TFormData, boolean>>; submitting: boolean }
    ) => {
        return createReducer(initialState, {
            'FORM/SET_VALUE': (state, action) => {
                const { field, value } = (action as any).payload;
                return {
                    ...state,
                    values: { ...state.values, [field]: value }
                };
            },
            'FORM/SET_ERROR': (state, action) => {
                const { field, error } = (action as any).payload;
                return {
                    ...state,
                    errors: { ...state.errors, [field]: error }
                };
            },
            'FORM/SET_TOUCHED': (state, action) => {
                const { field, touched = true } = (action as any).payload;
                return {
                    ...state,
                    touched: { ...state.touched, [field]: touched }
                };
            },
            'FORM/CLEAR_FIELD': (state, action) => {
                const field = (action as any).payload;
                const newValues = { ...state.values };
                const newErrors = { ...state.errors };
                const newTouched = { ...state.touched };

                delete newValues[field];
                delete newErrors[field];
                delete newTouched[field];

                return {
                    ...state,
                    values: newValues,
                    errors: newErrors,
                    touched: newTouched
                };
            },
            'FORM/CLEAR_FORM': () => initialState,
            'FORM/SET_SUBMITTING': (state, action) => ({
                ...state,
                submitting: (action as any).payload
            })
        });
    },

    /**
     * Creates a reducer for pagination state
     */
    createPaginationReducer: <TItem>(
        initialState: { items: TItem[]; page: number; pageSize: number; total: number; loading: boolean; error?: any }
    ) => {
        return createReducer(initialState, {
            'PAGINATION/SET_PAGE': (state, action) => ({
                ...state,
                page: (action as any).payload
            }),
            'PAGINATION/SET_PAGE_SIZE': (state, action) => ({
                ...state,
                pageSize: (action as any).payload
            }),
            'PAGINATION/FETCH_REQUEST': (state) => ({
                ...state,
                loading: true,
                error: null
            }),
            'PAGINATION/FETCH_SUCCESS': (state, action) => {
                const { items, total, page } = (action as any).payload;
                return {
                    ...state,
                    loading: false,
                    items,
                    total,
                    page
                };
            },
            'PAGINATION/FETCH_FAILURE': (state, action) => ({
                ...state,
                loading: false,
                error: (action as any).payload
            }),
            'PAGINATION/RESET': () => initialState
        });
    }
};

/**
 * Utility functions for reducer composition
 */
export const ReducerUtils = {
    /**
     * Combine multiple reducers with proper typing
     */
    combineReducers: <TState extends Record<string, any>, TAction extends BaseAction>(
        reducers: { [K in keyof TState]: Reducer<TState[K], TAction> }
    ): Reducer<TState, TAction> => {
        const keys = Object.keys(reducers) as Array<keyof TState>;

        return (state: TState | undefined, action: TAction): TState => {
            if (state === undefined) {
                return keys.reduce((acc, key) => {
                    acc[key] = (reducers[key] as any)(undefined, action);
                    return acc;
                }, {} as TState);
            }

            let hasChanged = false;
            const nextState = {} as TState;

            for (const key of keys) {
                const reducer = reducers[key];
                const previousStateForKey = state[key];
                const nextStateForKey = reducer(previousStateForKey, action);

                nextState[key] = nextStateForKey;
                hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
            }

            return hasChanged ? nextState : state;
        };
    },

    /**
     * Create a reducer that handles a specific slice of state
     */
    createSliceReducer: <TState, TAction extends BaseAction>(
        sliceName: string,
        initialState: TState,
        handlers: Record<string, (state: TState, action: TAction) => TState>
    ): Reducer<TState, TAction> => {
        return (state: TState = initialState, action: TAction): TState => {
            const handler = handlers[action.type];
            return handler ? handler(state, action) : state;
        };
    },

    /**
     * Create a reducer that only responds to specific action types
     */
    filterActions: <TState, TAction extends BaseAction>(
        reducer: Reducer<TState, TAction>,
        actionTypes: string[]
    ): Reducer<TState, TAction> => {
        return (state: TState | undefined, action: TAction): TState => {
            return actionTypes.includes(action.type) ? reducer(state, action) : (state as TState);
        };
    }
};

/**
 * Type helpers for reducer development
 */
export type ReducerState<R> = R extends Reducer<infer TState, any> ? TState : never;

export type ReducerAction<R> = R extends Reducer<any, infer TAction> ? TAction : never;

/**
 * Creates a reducer with built-in error handling
 */
export function withErrorHandling<TState, TAction extends BaseAction>(
    reducer: Reducer<TState, TAction>,
    errorHandler?: (error: Error, state: TState, action: TAction) => TState
): Reducer<TState, TAction> {
    return (state: TState | undefined, action: TAction): TState => {
        try {
            return reducer(state, action);
        } catch (error) {
            if (errorHandler) {
                return errorHandler(error as Error, state as TState, action);
            }
            console.error('Reducer error:', error, 'Action:', action);
            return state as TState;
        }
    };
}

/**
 * Creates a reducer with logging (development only)
 */
export function withLogging<TState, TAction extends BaseAction>(
    reducer: Reducer<TState, TAction>,
    logger?: (action: TAction, prevState: TState, nextState: TState) => void
): Reducer<TState, TAction> {
    return (state: TState | undefined, action: TAction): TState => {
        const prevState = state as TState;
        const nextState = reducer(state, action);

        if (logger && process.env.NODE_ENV === 'development') {
            logger(action, prevState, nextState);
        }

        return nextState;
    };
}

/**
 * Compose multiple reducer enhancers
 */
export function composeReducers<TState, TAction extends BaseAction>(
    ...enhancers: Array<(reducer: Reducer<TState, TAction>) => Reducer<TState, TAction>>
): (reducer: Reducer<TState, TAction>) => Reducer<TState, TAction> {
    return (reducer: Reducer<TState, TAction>) => {
        return enhancers.reduceRight((acc, enhancer) => enhancer(acc), reducer);
    };
}