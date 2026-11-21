import { BaseAction, Reducer } from './types';
export declare function createReducer<TState, TAction extends BaseAction = BaseAction>(initialState: TState, handlers: {
    [K in TAction['type']]: (state: TState, action: Extract<TAction, {
        type: K;
    }>) => TState;
}): Reducer<TState, TAction>;
export declare function createHandler<TState, TActionType extends string, TPayload>(handler: (state: TState, payload: TPayload) => TState): (state: TState, action: BaseAction<TActionType, TPayload>) => TState;
export declare function createSimpleHandler<TState>(handler: (state: TState) => TState): (state: TState, action: BaseAction) => TState;
export declare function cases<TState, TAction extends BaseAction>(handlers: {
    [K in TAction['type']]?: (state: TState, action: Extract<TAction, {
        type: K;
    }>) => TState;
}): { [K in TAction["type"]]?: ((state: TState, action: Extract<TAction, {
    type: K;
}>) => TState) | undefined; };
export declare const ReducerPatterns: {
    setValue: <T>(key: keyof T) => <TValue>(state: T, value: TValue) => T;
    setValues: <T>(state: T, values: Partial<T>) => T;
    toggle: <T>(key: keyof T) => (state: T) => T;
    addToArray: <T>(key: keyof T) => <TItem>(state: T, item: TItem) => T;
    removeFromArray: <T>(key: keyof T) => <TItem>(state: T, item: TItem) => T;
    updateInArray: <T>(key: keyof T) => <TItem extends {
        id: string;
    }>(state: T, id: string, updates: Partial<TItem>) => T;
    setLoading: <T extends {
        loading?: boolean;
    }>(loadingKey?: keyof T) => (state: T, loading: boolean) => T;
    setError: <T extends {
        error?: any;
    }>(errorKey?: keyof T) => (state: T, error: any) => T;
    clearError: <T extends {
        error?: any;
    }>(errorKey?: keyof T) => (state: T) => T;
    reset: <T>(initialState: T) => () => T;
    asyncOperation: <T extends {
        loading?: boolean;
        error?: any;
        data?: any;
    }>(state: T, action: BaseAction, successCallback?: (state: T, data: any) => T) => T;
};
export declare const AdvancedReducers: {
    createNormalizedReducer: <TEntity extends {
        id: string;
    }, TAction extends BaseAction>(entityName: string, initialState: {
        entities: Record<string, TEntity>;
        ids: string[];
        loading?: boolean;
        error?: any;
    }) => Reducer<{
        entities: Record<string, TEntity>;
        ids: string[];
        loading?: boolean;
        error?: any;
    }, BaseAction<string, any>>;
    createFormReducer: <TFormData>(initialState: {
        values: TFormData;
        errors: Partial<Record<keyof TFormData, string>>;
        touched: Partial<Record<keyof TFormData, boolean>>;
        submitting: boolean;
    }) => Reducer<{
        values: TFormData;
        errors: Partial<Record<keyof TFormData, string>>;
        touched: Partial<Record<keyof TFormData, boolean>>;
        submitting: boolean;
    }, BaseAction<string, any>>;
    createPaginationReducer: <TItem>(initialState: {
        items: TItem[];
        page: number;
        pageSize: number;
        total: number;
        loading: boolean;
        error?: any;
    }) => Reducer<{
        items: TItem[];
        page: number;
        pageSize: number;
        total: number;
        loading: boolean;
        error?: any;
    }, BaseAction<string, any>>;
};
export declare const ReducerUtils: {
    combineReducers: <TState extends Record<string, any>, TAction extends BaseAction>(reducers: { [K in keyof TState]: Reducer<TState[K], TAction>; }) => Reducer<TState, TAction>;
    createSliceReducer: <TState, TAction extends BaseAction>(sliceName: string, initialState: TState, handlers: Record<string, (state: TState, action: TAction) => TState>) => Reducer<TState, TAction>;
    filterActions: <TState, TAction extends BaseAction>(reducer: Reducer<TState, TAction>, actionTypes: string[]) => Reducer<TState, TAction>;
};
export type ReducerState<R> = R extends Reducer<infer TState, any> ? TState : never;
export type ReducerAction<R> = R extends Reducer<any, infer TAction> ? TAction : never;
export declare function withErrorHandling<TState, TAction extends BaseAction>(reducer: Reducer<TState, TAction>, errorHandler?: (error: Error, state: TState, action: TAction) => TState): Reducer<TState, TAction>;
export declare function withLogging<TState, TAction extends BaseAction>(reducer: Reducer<TState, TAction>, logger?: (action: TAction, prevState: TState, nextState: TState) => void): Reducer<TState, TAction>;
export declare function composeReducers<TState, TAction extends BaseAction>(...enhancers: Array<(reducer: Reducer<TState, TAction>) => Reducer<TState, TAction>>): (reducer: Reducer<TState, TAction>) => Reducer<TState, TAction>;
//# sourceMappingURL=reducers.d.ts.map