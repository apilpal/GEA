import { BaseAction, Reducer, Store, Listener, Unsubscribe, StoreConfig, Dispatch } from './types';
export declare class ReduxStore<TState = any, TAction extends BaseAction = BaseAction> implements Store<TState, TAction> {
    private state;
    private reducer;
    private listeners;
    private isDispatching;
    private devTools?;
    constructor(reducer: Reducer<TState, TAction>, initialState?: TState, config?: StoreConfig<TState>);
    getState(): TState;
    dispatch: Dispatch<TAction>;
    subscribe(listener: Listener<TState>): Unsubscribe;
    replaceReducer(nextReducer: Reducer<TState, TAction>): void;
    private setupDevTools;
    private applyMiddleware;
    get observable(): {
        subscribe: (observer: {
            next?: (state: TState) => void;
            error?: (error: any) => void;
            complete?: () => void;
        }) => {
            unsubscribe: () => void;
        };
        observable: () => any;
    };
}
export declare function createStore<TState, TAction extends BaseAction = BaseAction>(reducer: Reducer<TState, TAction>, initialState?: TState, config?: StoreConfig<TState>): ReduxStore<TState, TAction>;
export declare function combineReducers<TState extends Record<string, any>, TAction extends BaseAction = BaseAction>(reducers: {
    [K in keyof TState]: Reducer<TState[K], TAction>;
}): Reducer<TState, TAction>;
export declare function bindActionCreators<TActionCreators extends Record<string, any>, TAction extends BaseAction = BaseAction>(actionCreators: TActionCreators, dispatch: Dispatch<TAction>): TActionCreators;
//# sourceMappingURL=store.d.ts.map