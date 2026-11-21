// Core types for the Redux-like state management system

/**
 * Base action interface that all actions must extend
 */
export interface BaseAction<TType extends string = string, TPayload = any> {
    type: TType;
    payload?: TPayload;
    meta?: Record<string, any>;
    error?: boolean;
}

/**
 * Generic action creator type
 */
export type ActionCreator<TAction extends BaseAction> = (...args: any[]) => TAction;

/**
 * Async action creator that returns a thunk
 */
export type AsyncActionCreator<TAction extends BaseAction, TState = any, TExtra = any> =
    (...args: any[]) => (dispatch: Dispatch<TAction>, getState: () => TState, extra: TExtra) => Promise<any> | void;

/**
 * Action type map for type-safe action handling
 */
export type ActionTypeMap = Record<string, BaseAction>;

/**
 * Reducer function type
 */
export type Reducer<TState, TAction extends BaseAction = BaseAction> = (
    state: TState | undefined,
    action: TAction
) => TState;

/**
 * Selector function type with memoization support
 */
export type Selector<TState, TResult = any> = (state: TState) => TResult;

/**
 * Parametric selector that takes props
 */
export type ParametricSelector<TState, TProps, TResult = any> = (state: TState, props: TProps) => TResult;

/**
 * Memoized selector type
 */
export type MemoizedSelector<TState, TResult> = Selector<TState, TResult> & {
    clearCache(): void;
    getCache(): Map<string, TResult>;
};

/**
 * Middleware function type
 */
export type Middleware<TState = any, TAction extends BaseAction = BaseAction, TExtra = any> = (
    store: MiddlewareAPI<TState, TAction, TExtra>
) => (next: Dispatch<TAction>) => Dispatch<TAction>;

/**
 * Middleware API provided to middleware functions
 */
export interface MiddlewareAPI<TState, TAction extends BaseAction, TExtra = any> {
    dispatch: Dispatch<TAction>;
    getState(): TState;
    extra: TExtra;
}

/**
 * Dispatch function type
 */
export type Dispatch<TAction extends BaseAction = BaseAction> = (action: TAction) => TAction;

/**
 * Store subscription function type
 */
export type StoreSubscription = () => void;

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Listener function for store changes
 */
export type Listener<TState> = (state: TState, prevState: TState) => void;

/**
 * Store enhancer type (for store composition)
 */
export type StoreEnhancer<TState = any> = (createStore: StoreCreator<TState>) => StoreCreator<TState>;

/**
 * Store creator function type
 */
export type StoreCreator<TState> = <TAction extends BaseAction>(
    reducer: Reducer<TState, TAction>,
    initialState?: TState,
    enhancer?: StoreEnhancer<TState>
) => Store<TState, TAction>;

/**
 * Core store interface
 */
export interface Store<TState = any, TAction extends BaseAction = BaseAction> {
    dispatch: Dispatch<TAction>;
    getState(): TState;
    subscribe(listener: Listener<TState>): Unsubscribe;
    replaceReducer(nextReducer: Reducer<TState, TAction>): void;
    observable?: any;
}

/**
 * Observable store interface for RxJS integration
 */
export interface ObservableStore<TState> {
    subscribe(observer: {
        next?: (state: TState) => void;
        error?: (error: any) => void;
        complete?: () => void;
    }): { unsubscribe(): void };
    observable?: any;
}

/**
 * Store configuration options
 */
export interface StoreConfig<TState = any> {
    initialState?: TState;
    middleware?: Array<Middleware<TState>>;
    enhancers?: Array<StoreEnhancer<TState>>;
    devTools?: boolean;
}

/**
 * Action type helper for creating type-safe actions
 */
export type ActionType<T extends ActionTypeMap> = T[keyof T];

/**
 * Extract action type from action creator
 */
export type ActionTypeFromCreator<T extends ActionCreator<any>> = T extends ActionCreator<infer A> ? A : never;

/**
 * Extract payload type from action
 */
export type PayloadType<T extends BaseAction> = T extends BaseAction<any, infer P> ? P : never;

/**
 * Utility type for creating action types
 */
export type CreateActionType<TType extends string, TPayload = undefined> = TPayload extends undefined
    ? { type: TType }
    : { type: TType; payload: TPayload };

/**
 * Utility type for async action states
 */
export type AsyncState<TData = any, TError = any> = {
    data: TData | null;
    loading: boolean;
    error: TError | null;
};

/**
 * Utility type for normalized state
 */
export type NormalizedState<TEntity, TError = any> = {
    entities: Record<string, TEntity>;
    ids: string[];
    loading: boolean;
    error: TError | null;
};

/**
 * Selector memoization cache interface
 */
export interface SelectorCache {
    get(key: string): any;
    set(key: string, value: any): void;
    clear(): void;
    has(key: string): boolean;
}

/**
 * DevTools integration types
 */
export interface DevToolsExtension {
    connect(options?: { name?: string }): DevToolsInstance;
}

export interface DevToolsInstance {
    init(initialState?: any): void;
    send(action: any, state: any): void;
    subscribe(listener: (message: any) => void): () => void;
    unsubscribe(): void;
}

declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: DevToolsExtension;
    }
}