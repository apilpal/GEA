export interface BaseAction<TType extends string = string, TPayload = any> {
    type: TType;
    payload?: TPayload;
    meta?: Record<string, any>;
    error?: boolean;
}
export type ActionCreator<TAction extends BaseAction> = (...args: any[]) => TAction;
export type AsyncActionCreator<TAction extends BaseAction, TState = any, TExtra = any> = (...args: any[]) => (dispatch: Dispatch<TAction>, getState: () => TState, extra: TExtra) => Promise<any> | void;
export type ActionTypeMap = Record<string, BaseAction>;
export type Reducer<TState, TAction extends BaseAction = BaseAction> = (state: TState | undefined, action: TAction) => TState;
export type Selector<TState, TResult = any> = (state: TState) => TResult;
export type ParametricSelector<TState, TProps, TResult = any> = (state: TState, props: TProps) => TResult;
export type MemoizedSelector<TState, TResult> = Selector<TState, TResult> & {
    clearCache(): void;
    getCache(): Map<string, TResult>;
};
export type Middleware<TState = any, TAction extends BaseAction = BaseAction, TExtra = any> = (store: MiddlewareAPI<TState, TAction, TExtra>) => (next: Dispatch<TAction>) => Dispatch<TAction>;
export interface MiddlewareAPI<TState, TAction extends BaseAction, TExtra = any> {
    dispatch: Dispatch<TAction>;
    getState(): TState;
    extra: TExtra;
}
export type Dispatch<TAction extends BaseAction = BaseAction> = (action: TAction) => TAction;
export type StoreSubscription = () => void;
export type Unsubscribe = () => void;
export type Listener<TState> = (state: TState, prevState: TState) => void;
export type StoreEnhancer<TState = any> = (createStore: StoreCreator<TState>) => StoreCreator<TState>;
export type StoreCreator<TState> = <TAction extends BaseAction>(reducer: Reducer<TState, TAction>, initialState?: TState, enhancer?: StoreEnhancer<TState>) => Store<TState, TAction>;
export interface Store<TState = any, TAction extends BaseAction = BaseAction> {
    dispatch: Dispatch<TAction>;
    getState(): TState;
    subscribe(listener: Listener<TState>): Unsubscribe;
    replaceReducer(nextReducer: Reducer<TState, TAction>): void;
    observable?: any;
}
export interface ObservableStore<TState> {
    subscribe(observer: {
        next?: (state: TState) => void;
        error?: (error: any) => void;
        complete?: () => void;
    }): {
        unsubscribe(): void;
    };
    observable?: any;
}
export interface StoreConfig<TState = any> {
    initialState?: TState;
    middleware?: Array<Middleware<TState>>;
    enhancers?: Array<StoreEnhancer<TState>>;
    devTools?: boolean;
}
export type ActionType<T extends ActionTypeMap> = T[keyof T];
export type ActionTypeFromCreator<T extends ActionCreator<any>> = T extends ActionCreator<infer A> ? A : never;
export type PayloadType<T extends BaseAction> = T extends BaseAction<any, infer P> ? P : never;
export type CreateActionType<TType extends string, TPayload = undefined> = TPayload extends undefined ? {
    type: TType;
} : {
    type: TType;
    payload: TPayload;
};
export type AsyncState<TData = any, TError = any> = {
    data: TData | null;
    loading: boolean;
    error: TError | null;
};
export type NormalizedState<TEntity, TError = any> = {
    entities: Record<string, TEntity>;
    ids: string[];
    loading: boolean;
    error: TError | null;
};
export interface SelectorCache {
    get(key: string): any;
    set(key: string, value: any): void;
    clear(): void;
    has(key: string): boolean;
}
export interface DevToolsExtension {
    connect(options?: {
        name?: string;
    }): DevToolsInstance;
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