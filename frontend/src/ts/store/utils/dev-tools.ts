import { Store, BaseAction, DevToolsExtension, DevToolsInstance } from '@/ts/types/store';

/**
 * Development tools integration
 */
export interface DevToolsConfig {
    /** Name of the store for DevTools */
    name?: string;
    /** Whether to enable trace (default: false) */
    trace?: boolean;
    /** Maximum trace limit (default: 25) */
    traceLimit?: number;
    /** Custom serializer for state */
    serialize?: {
        replacer?: (key: string, value: any) => any;
        reviver?: (key: string, value: any) => any;
    };
}

/**
 * Redux DevTools extension interface (extending the existing one)
 */
interface ReduxDevToolsExtension extends DevToolsExtension {
    disconnect(): void;
    send(action: any, state: any, options?: { serialize?: boolean }): void;
    error(message: string): void;
}

/**
 * Enhanced store with DevTools integration
 */
export class DevToolsStore<TState = any, TAction extends BaseAction = BaseAction> {
    private store: Store<TState, TAction>;
    private devTools?: DevToolsInstance;
    private config: DevToolsConfig;

    constructor(
        store: Store<TState, TAction>,
        config: DevToolsConfig = {}
    ) {
        this.store = store;
        this.config = {
            name: 'Redux Store',
            trace: false,
            traceLimit: 25,
            ...config
        };

        this.initializeDevTools();
    }

    private initializeDevTools(): void {
        if (typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
            return;
        }

        try {
            this.devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect(this.config);

            // Subscribe to DevTools dispatches
            this.devTools.subscribe((message) => {
                if (message.type === 'DISPATCH' && message.payload) {
                    this.handleDevToolsMessage(message);
                }
            });

            // Send initial state
            this.devTools.init(this.store.getState());
        } catch (error) {
            console.warn('Failed to initialize Redux DevTools:', error);
        }
    }

    private handleDevToolsMessage(message: any): void {
        switch (message.payload.type) {
            case 'JUMP_TO_STATE':
            case 'JUMP_TO_ACTION':
                try {
                    const state = JSON.parse(message.state);
                    // Update store state without triggering reducers
                    (this.store as any).state = state;
                    // Notify listeners
                    (this.store as any).listeners.forEach((listener: any) => {
                        try {
                            listener(state, state);
                        } catch (error) {
                            console.error('Error in store listener during time travel:', error);
                        }
                    });
                } catch (error) {
                    console.error('Failed to parse state from DevTools:', error);
                }
                break;

            case 'COMMIT':
                this.devTools?.init(this.store.getState());
                break;

            case 'ROLLBACK':
                const parsedState = JSON.parse(message.state);
                (this.store as any).state = parsedState;
                this.devTools?.init(parsedState);
                break;

            case 'RESET':
                // Reset to initial state
                (this.store as any).state = (this.store as any).reducer(undefined, { type: '@@INIT' });
                this.devTools?.init(this.store.getState());
                break;
        }
    }

    /**
     * Get the underlying store
     */
    getStore(): Store<TState, TAction> {
        return this.store;
    }

    /**
     * Dispatch an action through the store
     */
    dispatch(action: TAction): TAction {
        const result = this.store.dispatch(action);

        // Send to DevTools
        if (this.devTools) {
            try {
                this.devTools.send(action, this.store.getState());
            } catch (error) {
                console.warn('Failed to send action to DevTools:', error);
            }
        }

        return result;
    }

    /**
     * Get current state
     */
    getState(): TState {
        return this.store.getState();
    }

    /**
     * Subscribe to store changes
     */
    subscribe(listener: (state: TState, prevState: TState) => void): () => void {
        return this.store.subscribe(listener);
    }
}

/**
 * Creates a store with DevTools integration
 */
export function createDevToolsStore<TState, TAction extends BaseAction = BaseAction>(
    store: Store<TState, TAction>,
    config?: DevToolsConfig
): DevToolsStore<TState, TAction> {
    return new DevToolsStore(store, config);
}

/**
 * Development utilities for debugging
 */
export const DevToolsUtils = {
    /**
     * Logs current store state to console
     */
    logState: <TState>(store: Store<TState, BaseAction>): void => {
        console.log('Current store state:', store.getState());
    },

    /**
     * Logs action to console with timestamp
     */
    logAction: (action: BaseAction): void => {
        console.log(`[${new Date().toISOString()}] Action dispatched:`, action);
    },

    /**
     * Creates an action logger middleware
     */
    createActionLogger: () => {
        return (store: any) => (next: any) => (action: BaseAction) => {
            if (process.env.NODE_ENV === 'development') {
                console.group(`Action: ${action.type}`);
                console.log('Action:', action);
                console.log('Previous State:', store.getState());

                const result = next(action);

                console.log('Next State:', store.getState());
                console.groupEnd();

                return result;
            }

            return next(action);
        };
    },

    /**
     * Creates a state change tracker
     */
    createStateTracker: <TState>(store: Store<TState, BaseAction>) => {
        let previousState: TState;

        return {
            trackChanges: (callback?: (changes: { previous: TState; current: TState; action?: BaseAction }) => void) => {
                return store.subscribe((current, prev) => {
                    previousState = prev;
                    const currentState = current;

                    if (callback) {
                        callback({ previous: previousState, current: currentState });
                    } else {
                        console.log('State changed:', {
                            previous: previousState,
                            current: currentState
                        });
                    }
                });
            },

            getPreviousState: (): TState | undefined => previousState
        };
    },

    /**
     * Creates a comprehensive store inspector
     */
    createStoreInspector: <TState, TAction extends BaseAction>(store: Store<TState, TAction>) => {
        return {
            inspect: (): {
                state: TState;
                actionCount: number;
                listenersCount: number;
                reducer: string;
            } => {
                return {
                    state: store.getState(),
                    actionCount: (store as any).metrics?.actionCount || 0,
                    listenersCount: (store as any).listeners?.size || 0,
                    reducer: (store as any).reducer?.name || 'Unknown'
                };
            },

            exportState: (): string => {
                return JSON.stringify(store.getState(), null, 2);
            },

            importState: (stateJson: string): boolean => {
                try {
                    const state = JSON.parse(stateJson);
                    (store as any).state = state;
                    return true;
                } catch (error) {
                    console.error('Failed to import state:', error);
                    return false;
                }
            }
        };
    }
};

/**
 * Development-time store enhancers
 */
export const DevStoreEnhancers = {
    /**
     * Adds immutable state checking in development
     */
    withImmutabilityCheck: <TState, TAction extends BaseAction>(
        store: Store<TState, TAction>
    ): Store<TState, TAction> => {
        if (process.env.NODE_ENV !== 'development') {
            return store;
        }

        const originalDispatch = store.dispatch.bind(store);

        (store as any).dispatch = (action: TAction): TAction => {
            const prevState = store.getState();

            // Check if state is being mutated
            const stateAfterDispatch = store.getState();

            if (prevState === stateAfterDispatch) {
                console.warn('State reference did not change after dispatch. This might indicate a mutation issue.');
            }

            return originalDispatch(action);
        };

        return store;
    },

    /**
     * Adds action validation in development
     */
    withActionValidation: <TState, TAction extends BaseAction>(
        store: Store<TState, TAction>,
        validator?: (action: TAction) => boolean | string
    ): Store<TState, TAction> => {
        if (process.env.NODE_ENV !== 'development') {
            return store;
        }

        const originalDispatch = store.dispatch.bind(store);

        (store as any).dispatch = (action: TAction): TAction => {
            if (validator) {
                const validationResult = validator(action);
                if (validationResult !== true) {
                    const message = typeof validationResult === 'string'
                        ? validationResult
                        : `Invalid action: ${action.type}`;
                    console.error(message, action);
                    throw new Error(message);
                }
            }

            return originalDispatch(action);
        };

        return store;
    }
};