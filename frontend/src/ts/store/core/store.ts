import {
    BaseAction,
    Reducer,
    Store,
    Listener,
    Unsubscribe,
    StoreConfig,
    StoreEnhancer,
    Middleware,
    MiddlewareAPI,
    Dispatch,
    DevToolsExtension,
    DevToolsInstance
} from './types';

/**
 * Core Redux-like store implementation with TypeScript support
 */
export class ReduxStore<TState = any, TAction extends BaseAction = BaseAction> implements Store<TState, TAction> {
    private state: TState;
    private reducer: Reducer<TState, TAction>;
    private listeners: Set<Listener<TState>> = new Set();
    private isDispatching: boolean = false;
    private devTools?: DevToolsInstance;

    constructor(
        reducer: Reducer<TState, TAction>,
        initialState?: TState,
        config?: StoreConfig<TState>
    ) {
        this.reducer = reducer;
        this.state = initialState ?? (reducer(undefined, { type: '@@INIT' } as TAction));

        // Setup DevTools if available and enabled
        if (config?.devTools !== false && typeof window !== 'undefined') {
            this.setupDevTools();
        }

        // Apply middleware if provided
        if (config?.middleware && config.middleware.length > 0) {
            this.applyMiddleware(config.middleware as Array<Middleware<TState, TAction>>);
        }
    }

    /**
     * Get the current state
     */
    getState(): TState {
        if (this.isDispatching) {
            throw new Error(
                'You may not call store.getState() while the reducer is executing. ' +
                'The reducer has already received the state as an argument. ' +
                'Pass it down from the top reducer instead of reading it from the store.'
            );
        }
        return this.state;
    }

    /**
     * Dispatch an action to update the state
     */
    dispatch: Dispatch<TAction> = (action: TAction): TAction => {
        if (this.isDispatching) {
            throw new Error('Reducers may not dispatch actions.');
        }

        try {
            this.isDispatching = true;
            const prevState = this.state;

            // Apply the reducer to get the new state
            this.state = this.reducer(this.state, action);

            // Notify all listeners of the state change
            this.listeners.forEach(listener => {
                try {
                    listener(this.state, prevState);
                } catch (error) {
                    console.error('Error in store listener:', error);
                }
            });

            // Send to DevTools
            if (this.devTools) {
                this.devTools.send(action, this.state);
            }

            return action;
        } finally {
            this.isDispatching = false;
        }
    };

    /**
     * Subscribe to store changes
     */
    subscribe(listener: Listener<TState>): Unsubscribe {
        if (typeof listener !== 'function') {
            throw new Error('Expected the listener to be a function.');
        }

        let isSubscribed = true;

        this.listeners.add(listener);

        return () => {
            if (!isSubscribed) {
                return;
            }

            isSubscribed = false;
            this.listeners.delete(listener);
        };
    }

    /**
     * Replace the reducer used by the store
     */
    replaceReducer(nextReducer: Reducer<TState, TAction>): void {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.');
        }

        this.reducer = nextReducer;

        // Re-run the reducer with the current state to ensure compatibility
        this.state = this.reducer(this.state, { type: '@@INIT' } as TAction);

        // Notify listeners of the reducer change
        this.listeners.forEach(listener => {
            try {
                listener(this.state, this.state);
            } catch (error) {
                console.error('Error in store listener after reducer replacement:', error);
            }
        });
    }

    /**
     * Setup Redux DevTools integration
     */
    private setupDevTools(): void {
        if (typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
            return;
        }

        try {
            this.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
                name: 'TypeScript Store'
            });

            // Subscribe to DevTools dispatches
            this.devTools.subscribe((message) => {
                if (message.type === 'DISPATCH' && message.payload) {
                    switch (message.payload.type) {
                        case 'JUMP_TO_STATE':
                        case 'JUMP_TO_ACTION':
                            this.state = JSON.parse(message.state);
                            this.listeners.forEach(listener => {
                                try {
                                    listener(this.state, this.state);
                                } catch (error) {
                                    console.error('Error in store listener during time travel:', error);
                                }
                            });
                            break;
                        case 'COMMIT':
                            this.devTools?.init(this.state);
                            break;
                        case 'ROLLBACK':
                            this.state = JSON.parse(message.state);
                            this.devTools?.init(this.state);
                            break;
                        case 'RESET':
                            this.state = this.reducer(undefined, { type: '@@INIT' } as TAction);
                            this.devTools?.init(this.state);
                            break;
                    }
                }
            });

            // Send initial state
            this.devTools.init(this.state);
        } catch (error) {
            console.warn('Failed to setup Redux DevTools:', error);
        }
    }

    /**
     * Apply middleware to enhance the store
     */
    private applyMiddleware(middleware: Array<Middleware<TState, TAction>>): void {
        if (middleware.length === 0) {
            return;
        }

        // Create middleware API
        const middlewareAPI: MiddlewareAPI<TState, TAction> = {
            getState: () => this.state,
            dispatch: (action) => this.dispatch(action),
            extra: {} as any // Can be extended with extra arguments
        };

        // Chain middleware
        let dispatch: Dispatch<TAction> = this.dispatch.bind(this);

        const chain = middleware.map(middleware => middleware(middlewareAPI));
        dispatch = compose(...chain)(dispatch);

        this.dispatch = dispatch;
    }

    /**
     * Observable interface for RxJS integration
     */
    get observable() {
        const self = this;
        return {
            subscribe: function(observer: {
                next?: (state: TState) => void;
                error?: (error: any) => void;
                complete?: () => void;
            }) {
                const listener: Listener<TState> = (state) => {
                    if (observer.next) {
                        observer.next(state);
                    }
                };

                const unsubscribe = self.subscribe(listener);

                return {
                    unsubscribe: () => {
                        unsubscribe();
                        if (observer.complete) {
                            observer.complete();
                        }
                    }
                };
            },
            // Use string key to avoid Symbol.observable issues
            'observable': function() { return self.observable; }
        };
    }
}

/**
 * Create a Redux store with optional configuration
 */
export function createStore<TState, TAction extends BaseAction = BaseAction>(
    reducer: Reducer<TState, TAction>,
    initialState?: TState,
    config?: StoreConfig<TState>
): ReduxStore<TState, TAction> {
    return new ReduxStore(reducer, initialState, config);
}

/**
 * Compose multiple functions from right to left
 */
function compose<T>(...funcs: Array<(arg: T) => T>): (arg: T) => T {
    if (funcs.length === 0) {
        return (arg: T) => arg;
    }

    if (funcs.length === 1) {
        return funcs[0];
    }

    return funcs.reduce((a, b) => (arg: T) => a(b(arg)));
}

/**
 * Combine multiple reducers into a single reducer
 */
export function combineReducers<TState extends Record<string, any>, TAction extends BaseAction = BaseAction>(
    reducers: { [K in keyof TState]: Reducer<TState[K], TAction> }
): Reducer<TState, TAction> {
    const reducerKeys = Object.keys(reducers) as Array<keyof TState>;
    const finalReducers: { [K in keyof TState]: Reducer<TState[K], TAction> } = {} as any;

    // Filter out non-function values and warn about them
    for (const key of reducerKeys) {
        if (typeof reducers[key] === 'function') {
            finalReducers[key] = reducers[key];
        }
    }

    const finalReducerKeys = Object.keys(finalReducers) as Array<keyof TState>;

    return function combination(state: TState | undefined, action: TAction): TState {
        let hasChanged = false;
        const nextState: TState = {} as TState;

        for (const key of finalReducerKeys) {
            const reducer = finalReducers[key];
            const previousStateForKey = state?.[key];
            const nextStateForKey = reducer(previousStateForKey, action);

            nextState[key] = nextStateForKey;
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
        }

        return hasChanged ? nextState : (state ?? ({} as TState));
    };
}

/**
 * Bind action creators to dispatch function
 */
export function bindActionCreators<TActionCreators extends Record<string, any>, TAction extends BaseAction = BaseAction>(
    actionCreators: TActionCreators,
    dispatch: Dispatch<TAction>
): TActionCreators {
    const boundActionCreators: Partial<TActionCreators> = {};

    for (const [key, actionCreator] of Object.entries(actionCreators)) {
        if (typeof actionCreator === 'function') {
            (boundActionCreators as any)[key] = (...args: any[]) => {
                const action = actionCreator(...args);
                return dispatch(action);
            };
        }
    }

    return boundActionCreators as TActionCreators;
}