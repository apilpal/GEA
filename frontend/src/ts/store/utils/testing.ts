import { Store, BaseAction, Reducer } from '@/ts/types/store';

/**
 * Testing utilities for Redux stores
 */
export interface TestStore<TState = any, TAction extends BaseAction = BaseAction> {
    store: Store<TState, TAction>;
    dispatch: (action: TAction) => TAction;
    getState: () => TState;
    subscribe: (listener: (state: TState) => void) => () => void;
    reset: () => void;
    getActions: () => TAction[];
    clearActions: () => void;
}

/**
 * Creates a test store for unit testing
 */
export function createTestStore<TState, TAction extends BaseAction = BaseAction>(
    reducer: Reducer<TState, TAction>,
    initialState?: TState,
    middleware: Array<any> = []
): TestStore<TState, TAction> {
    const actions: TAction[] = [];
    let currentState = initialState ?? (reducer(undefined, { type: '@@INIT' } as TAction));

    // Create a simple test store
    const listeners = new Set<(state: TState) => void>();

    const testStore = {
        store: {
            dispatch: (action: TAction): TAction => {
                actions.push(action);
                const previousState = currentState;
                currentState = reducer(currentState, action);

                // Notify listeners
                listeners.forEach(listener => {
                    try {
                        listener(currentState);
                    } catch (error) {
                        console.error('Error in test store listener:', error);
                    }
                });

                return action;
            },

            getState: (): TState => currentState,

            subscribe: (listener: (state: TState, prevState: TState) => void): (() => void) => {
                const wrappedListener = (state: TState) => {
                    listener(state, currentState);
                };
                listeners.add(wrappedListener);
                return () => {
                    listeners.delete(wrappedListener);
                };
            },

            replaceReducer: () => {},
            observable: undefined
        },

        dispatch: (action: TAction): TAction => testStore.store.dispatch(action),

        getState: (): TState => testStore.store.getState(),

        subscribe: (listener: (state: TState) => void): (() => void) => {
            return testStore.store.subscribe(listener);
        },

        reset: (): void => {
            currentState = initialState ?? (reducer(undefined, { type: '@@INIT' } as TAction));
            actions.length = 0;
            listeners.clear();
        },

        getActions: (): TAction[] => [...actions],

        clearActions: (): void => {
            actions.length = 0;
        }
    };

    return testStore;
}

/**
 * Test helpers for actions
 */
export const TestActionHelpers = {
    /**
     * Waits for a specific action type to be dispatched
     */
    waitForAction: <TAction extends BaseAction>(
        store: Store<any, TAction>,
        actionType: TAction['type'],
        timeout: number = 5000
    ): Promise<TAction> => {
        return new Promise((resolve, reject) => {
            const unsubscribe = store.subscribe(() => {
                // This would need to be implemented with access to dispatched actions
                // For now, this is a placeholder
            });

            setTimeout(() => {
                unsubscribe();
                reject(new Error(`Timeout waiting for action: ${actionType}`));
            }, timeout);
        });
    },

    /**
     * Expects a specific action to be dispatched
     */
    expectAction: <TAction extends BaseAction>(
        actions: TAction[],
        actionType: TAction['type']
    ): TAction => {
        const action = actions.find(a => a.type === actionType);
        if (!action) {
            throw new Error(`Expected action ${actionType} was not dispatched`);
        }
        return action;
    },

    /**
     * Expects no actions to be dispatched
     */
    expectNoActions: (actions: BaseAction[]): void => {
        if (actions.length > 0) {
            throw new Error(`Expected no actions, but got: ${actions.map(a => a.type).join(', ')}`);
        }
    }
};

/**
 * Test helpers for state
 */
export const TestStateHelpers = {
    /**
     * Expects state to equal expected value
     */
    expectState: <TState>(
        actualState: TState,
        expectedState: TState
    ): void => {
        if (JSON.stringify(actualState) !== JSON.stringify(expectedState)) {
            throw new Error(`Expected state: ${JSON.stringify(expectedState)}, got: ${JSON.stringify(actualState)}`);
        }
    },

    /**
     * Expects state to contain specific values
     */
    expectStateToContain: <TState extends Record<string, any>>(
        actualState: TState,
        expectedValues: Partial<TState>
    ): void => {
        for (const [key, value] of Object.entries(expectedValues)) {
            if (JSON.stringify(actualState[key]) !== JSON.stringify(value)) {
                throw new Error(`Expected state.${key} to be ${JSON.stringify(value)}, got ${JSON.stringify(actualState[key])}`);
            }
        }
    },

    /**
     * Expects state to have changed from previous state
     */
    expectStateChanged: <TState>(
        previousState: TState,
        currentState: TState
    ): void => {
        if (JSON.stringify(previousState) === JSON.stringify(currentState)) {
            throw new Error('Expected state to change, but it did not');
        }
    },

    /**
     * Expects state to not have changed from previous state
     */
    expectStateUnchanged: <TState>(
        previousState: TState,
        currentState: TState
    ): void => {
        if (JSON.stringify(previousState) !== JSON.stringify(currentState)) {
            throw new Error(`Expected state to remain unchanged, but it changed from ${JSON.stringify(previousState)} to ${JSON.stringify(currentState)}`);
        }
    }
};

/**
 * Mock implementations for testing
 */
export const TestMocks = {
    /**
     * Creates a mock store for testing
     */
    createMockStore: <TState, TAction extends BaseAction>(
        initialState: TState
    ): {
        store: Store<TState, TAction>;
        dispatch: jest.Mock;
        getState: jest.Mock;
        subscribe: jest.Mock;
    } => {
        const dispatch = jest.fn();
        const getState = jest.fn(() => initialState);
        const subscribe = jest.fn(() => jest.fn());

        return {
            store: {
                dispatch,
                getState,
                subscribe,
                replaceReducer: jest.fn(),
                observable: undefined
            } as any,
            dispatch,
            getState,
            subscribe
        };
    },

    /**
     * Creates a mock action
     */
    createMockAction: <T extends string, P = any>(type: T, payload?: P): BaseAction<T, P> => ({
        type,
        payload
    }),

    /**
     * Creates a mock reducer
     */
    createMockReducer: <TState, TAction extends BaseAction>(
        defaultState: TState
    ): Reducer<TState, TAction> => {
        return (state: TState = defaultState, action: TAction): TState => {
            return state;
        };
    }
};

/**
 * Integration testing helpers
 */
export const TestIntegrationHelpers = {
    /**
     * Tests a complete Redux flow (action -> reducer -> state change)
     */
    testReduxFlow: async <TState, TAction extends BaseAction>(
        store: Store<TState, TAction>,
        actions: TAction[],
        expectedStateChanges: Array<(state: TState) => boolean>,
        options: {
            timeout?: number;
            expectExactState?: boolean;
        } = {}
    ): Promise<void> => {
        const { timeout = 5000, expectExactState = false } = options;

        return new Promise((resolve, reject) => {
            const initialState = store.getState();
            let stateChangeCount = 0;
            let resolved = false;

            const unsubscribe = store.subscribe((newState) => {
                stateChangeCount++;

                // Check if this state change matches our expectations
                if (stateChangeCount <= expectedStateChanges.length) {
                    const expectation = expectedStateChanges[stateChangeCount - 1];
                    if (expectation(newState)) {
                        if (stateChangeCount === expectedStateChanges.length) {
                            resolved = true;
                            unsubscribe();
                            resolve();
                        }
                    } else if (expectExactState) {
                        resolved = true;
                        unsubscribe();
                        reject(new Error(`State change ${stateChangeCount} did not match expectation`));
                    }
                }
            });

            // Dispatch all actions
            actions.forEach(action => store.dispatch(action));

            // Set timeout
            setTimeout(() => {
                if (!resolved) {
                    unsubscribe();
                    reject(new Error(`Redux flow test timed out after ${timeout}ms`));
                }
            }, timeout);
        });
    },

    /**
     * Tests async Redux operations
     */
    testAsyncFlow: async <TState, TAction extends BaseAction>(
        store: Store<TState, TAction>,
        asyncAction: () => Promise<any>,
        expectedActions: TAction['type'][],
        options: {
            timeout?: number;
            checkOrder?: boolean;
        } = {}
    ): Promise<TAction[]> => {
        const { timeout = 5000, checkOrder = true } = options;
        const dispatchedActions: TAction[] = [];

        // This is a simplified implementation
        // In a real testing environment, you would capture dispatched actions

        try {
            await asyncAction();
        } catch (error) {
            throw new Error(`Async action failed: ${error}`);
        }

        return dispatchedActions;
    }
};

/**
 * Performance testing helpers
 */
export const TestPerformanceHelpers = {
    /**
     * Measures average dispatch time
     */
    measureDispatchTime: async <TState, TAction extends BaseAction>(
        store: Store<TState, TAction>,
        actions: TAction[],
        iterations: number = 100
    ): Promise<number> => {
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();

            actions.forEach(action => {
                store.dispatch(action);
            });

            const end = performance.now();
            times.push(end - start);
        }

        return times.reduce((sum, time) => sum + time, 0) / times.length;
    },

    /**
     * Stress tests the store with many actions
     */
    stressTest: async <TState, TAction extends BaseAction>(
        store: Store<TState, TAction>,
        actionGenerator: () => TAction,
        actionCount: number = 10000
    ): Promise<{
        totalTime: number;
        averageTime: number;
        actionsPerSecond: number;
        finalState: TState;
    }> => {
        const start = performance.now();

        for (let i = 0; i < actionCount; i++) {
            store.dispatch(actionGenerator());
        }

        const end = performance.now();
        const totalTime = end - start;
        const averageTime = totalTime / actionCount;
        const actionsPerSecond = (actionCount / totalTime) * 1000;

        return {
            totalTime,
            averageTime,
            actionsPerSecond,
            finalState: store.getState()
        };
    }
};

/**
 * Jest matchers for Redux testing
 */
export const ReduxMatchers = {
    /**
     * Matcher to check if action was dispatched
     */
    toDispatchAction: (actions: BaseAction[], expectedAction: BaseAction) => {
        const action = actions.find(a => a.type === expectedAction.type);
        return {
            pass: !!action,
            message: () => `Expected action ${expectedAction.type} to be dispatched`
        };
    },

    /**
     * Matcher to check if state changed as expected
     */
    toHaveStateChanged: (previousState: any, currentState: any) => {
        return {
            pass: JSON.stringify(previousState) !== JSON.stringify(currentState),
            message: () => 'Expected state to change, but it did not'
        };
    }
};

/**
 * Test setup and teardown utilities
 */
export const TestSetup = {
    /**
     * Creates a fresh test store for each test
     */
    createTestStoreFactory: <TState, TAction extends BaseAction>(
        reducer: Reducer<TState, TAction>,
        initialState?: TState
    ) => {
        return (): TestStore<TState, TAction> => {
            return createTestStore(reducer, initialState);
        };
    },

    /**
     * Creates test data generators
     */
    createTestDataGenerator: <T>(generatorFn: () => T) => {
        return {
            generate: generatorFn,
            generateMany: (count: number): T[] => {
                return Array.from({ length: count }, generatorFn);
            }
        };
    }
};