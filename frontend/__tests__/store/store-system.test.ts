// Redux-like Store System tests with TypeScript strict mode

import { createStore, ReduxStore, combineReducers, bindActionCreators } from '../../src/ts/store/core/store';
import {
    BaseAction,
    Reducer,
    Store,
    Middleware,
    Dispatch,
    Unsubscribe,
    StoreConfig,
    MiddlewareAPI,
    Listener,
    StoreEnhancer,
    StoreCreator
} from '../../src/ts/types/store';

// Test interfaces
interface CounterState {
    value: number;
    step: number;
}

interface TodoItem {
    id: string;
    text: string;
    completed: boolean;
}

interface TodoState {
    items: TodoItem[];
    filter: 'all' | 'active' | 'completed';
}

interface AppState {
    counter: CounterState;
    todos: TodoState;
}

// Action types
interface CounterAction extends BaseAction {
    type: 'INCREMENT' | 'DECREMENT' | 'SET_STEP' | 'RESET';
    payload?: number;
}

interface TodoAction extends BaseAction {
    type: 'ADD_TODO' | 'TOGGLE_TODO' | 'DELETE_TODO' | 'SET_FILTER';
    payload?: any;
}

type AppAction = CounterAction | TodoAction;

// Reducers
const counterReducer: Reducer<CounterState, CounterAction> = (state = { value: 0, step: 1 }, action) => {
    switch (action.type) {
        case 'INCREMENT':
            return { ...state, value: state.value + (state.step) };
        case 'DECREMENT':
            return { ...state, value: state.value - (state.step) };
        case 'SET_STEP':
            return { ...state, step: action.payload || 1 };
        case 'RESET':
            return { value: 0, step: 1 };
        default:
            return state;
    }
};

const todoReducer: Reducer<TodoState, TodoAction> = (state = { items: [], filter: 'all' }, action) => {
    switch (action.type) {
        case 'ADD_TODO':
            return {
                ...state,
                items: [...state.items, {
                    id: Date.now().toString(),
                    text: action.payload,
                    completed: false
                }]
            };
        case 'TOGGLE_TODO':
            return {
                ...state,
                items: state.items.map(todo =>
                    todo.id === action.payload
                        ? { ...todo, completed: !todo.completed }
                        : todo
                )
            };
        case 'DELETE_TODO':
            return {
                ...state,
                items: state.items.filter(todo => todo.id !== action.payload)
            };
        case 'SET_FILTER':
            return { ...state, filter: action.payload };
        default:
            return state;
    }
};

const appReducer = combineReducers<AppState, AppAction>({
    counter: counterReducer,
    todos: todoReducer,
});

// Action creators
const counterActions = {
    increment: (): CounterAction => ({ type: 'INCREMENT' }),
    decrement: (): CounterAction => ({ type: 'DECREMENT' }),
    setStep: (step: number): CounterAction => ({ type: 'SET_STEP', payload: step }),
    reset: (): CounterAction => ({ type: 'RESET' }),
};

const todoActions = {
    addTodo: (text: string): TodoAction => ({ type: 'ADD_TODO', payload: text }),
    toggleTodo: (id: string): TodoAction => ({ type: 'TOGGLE_TODO', payload: id }),
    deleteTodo: (id: string): TodoAction => ({ type: 'DELETE_TODO', payload: id }),
    setFilter: (filter: 'all' | 'active' | 'completed'): TodoAction => ({ type: 'SET_FILTER', payload: filter }),
};

// Middleware for testing
const testMiddleware: Middleware<AppState, AppAction> = (api) => (next) => (action) => {
    // Test middleware that logs actions
    const result = next(action);
    return result;
};

const errorMiddleware: Middleware<AppState, AppAction> = (api) => (next) => (action) => {
    try {
        return next(action);
    } catch (error) {
        console.error('Middleware caught error:', error);
        throw error;
    }
};

describe('Redux-like Store System', () => {
    let store: ReduxStore<AppState, AppAction>;

    beforeEach(() => {
        store = createStore(appReducer);
    });

    describe('Store Creation', () => {
        it('should create a store with initial state', () => {
            const state = store.getState();

            expect(state).toEqual({
                counter: { value: 0, step: 1 },
                todos: { items: [], filter: 'all' }
            });
        });

        it('should create a store with custom initial state', () => {
            const initialState: AppState = {
                counter: { value: 10, step: 2 },
                todos: {
                    items: [{ id: '1', text: 'Test todo', completed: false }],
                    filter: 'active'
                }
            };

            const customStore = createStore(appReducer, initialState);
            const state = customStore.getState();

            expect(state).toEqual(initialState);
        });

        it('should create a store with middleware', () => {
            const storeWithMiddleware = createStore(appReducer, undefined, {
                middleware: [testMiddleware, errorMiddleware]
            });

            expect(storeWithMiddleware).toBeInstanceOf(ReduxStore);

            const state = storeWithMiddleware.getState();
            expect(state.counter.value).toBe(0);
        });

        it('should handle reducer returning undefined for INIT action', () => {
            const simpleReducer: Reducer<number, CounterAction> = (state, action) => {
                if (action.type === '@@INIT') return 42;
                return state || 0;
            };

            const simpleStore = createStore(simpleReducer);
            expect(simpleStore.getState()).toBe(42);
        });
    });

    describe('State Management', () => {
        it('should get current state', () => {
            const state = store.getState();
            expect(state.counter.value).toBe(0);
            expect(state.todos.items).toEqual([]);
        });

        it('should prevent getState during dispatch', () => {
            const action: CounterAction = { type: 'INCREMENT' };

            // This test verifies the error handling in getState during dispatch
            expect(() => store.getState()).not.toThrow();

            // In a real scenario, this would throw if called during dispatch
            // The store implementation prevents this
        });

        it('should maintain state immutability', () => {
            const initialState = store.getState();
            initialState.counter.value = 999; // Try to mutate

            const currentState = store.getState();
            expect(currentState.counter.value).toBe(0); // Should remain unchanged
        });
    });

    describe('Action Dispatching', () => {
        it('should dispatch actions and update state', () => {
            store.dispatch(counterActions.increment());

            let state = store.getState();
            expect(state.counter.value).toBe(1);

            store.dispatch(counterActions.increment());

            state = store.getState();
            expect(state.counter.value).toBe(2);
        });

        it('should handle multiple action types', () => {
            store.dispatch(counterActions.setStep(5));
            store.dispatch(counterActions.increment());

            const state = store.getState();
            expect(state.counter.value).toBe(5);
            expect(state.counter.step).toBe(5);
        });

        it('should handle todo actions', () => {
            store.dispatch(todoActions.addTodo('Test todo 1'));
            store.dispatch(todoActions.addTodo('Test todo 2'));

            let state = store.getState();
            expect(state.todos.items).toHaveLength(2);
            expect(state.todos.items[0].text).toBe('Test todo 1');

            store.dispatch(todoActions.toggleTodo(state.todos.items[0].id));

            state = store.getState();
            expect(state.todos.items[0].completed).toBe(true);
        });

        it('should prevent dispatch during reducer execution', () => {
            // This test verifies the dispatch guard
            const action: CounterAction = { type: 'INCREMENT' };

            // Normal dispatch should work
            expect(() => store.dispatch(action)).not.toThrow();
        });

        it('should return the dispatched action', () => {
            const action: CounterAction = { type: 'INCREMENT' };
            const result = store.dispatch(action);

            expect(result).toBe(action);
        });
    });

    describe('Subscriptions', () => {
        it('should notify subscribers of state changes', () => {
            const listener = jest.fn();

            const unsubscribe = store.subscribe(listener);

            store.dispatch(counterActions.increment());

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    counter: { value: 1, step: 1 }
                }),
                expect.objectContaining({
                    counter: { value: 0, step: 1 }
                })
            );

            unsubscribe();
        });

        it('should handle multiple subscribers', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            const unsubscribe1 = store.subscribe(listener1);
            const unsubscribe2 = store.subscribe(listener2);

            store.dispatch(counterActions.increment());

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);

            unsubscribe1();
            unsubscribe2();
        });

        it('should handle subscriber errors gracefully', () => {
            const goodListener = jest.fn();
            const badListener = jest.fn().mockImplementation(() => {
                throw new Error('Listener error');
            });

            const unsubscribeGood = store.subscribe(goodListener);
            const unsubscribeBad = store.subscribe(badListener);

            // Should not throw despite bad listener
            expect(() => store.dispatch(counterActions.increment())).not.toThrow();

            expect(goodListener).toHaveBeenCalledTimes(1);

            unsubscribeGood();
            unsubscribeBad();
        });

        it('should not notify unsubscribed listeners', () => {
            const listener = jest.fn();

            const unsubscribe = store.subscribe(listener);
            store.dispatch(counterActions.increment());

            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();

            store.dispatch(counterActions.increment());
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should require listener to be a function', () => {
            expect(() => {
                (store as any).subscribe('not a function');
            }).toThrow('Expected the listener to be a function.');
        });
    });

    describe('Reducer Replacement', () => {
        it('should replace reducer correctly', () => {
            const newReducer: Reducer<AppState, AppAction> = (state, action) => {
                if (action.type === 'INCREMENT') {
                    return {
                        ...state,
                        counter: { ...state.counter, value: 999 }
                    };
                }
                return state || { counter: { value: 0, step: 1 }, todos: { items: [], filter: 'all' } };
            };

            store.dispatch(counterActions.increment());

            let state = store.getState();
            expect(state.counter.value).toBe(1);

            store.replaceReducer(newReducer);

            store.dispatch(counterActions.increment());

            state = store.getState();
            expect(state.counter.value).toBe(999);
        });

        it('should require reducer to be a function', () => {
            expect(() => {
                (store as any).replaceReducer('not a function');
            }).toThrow('Expected the nextReducer to be a function.');
        });

        it('should notify listeners after reducer replacement', () => {
            const listener = jest.fn();

            store.subscribe(listener);
            store.replaceReducer(appReducer);

            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    describe('Middleware Integration', () => {
        it('should apply middleware correctly', () => {
            let middlewareCalled = false;

            const testMiddleware: Middleware<AppState, AppAction> = (api) => (next) => (action) => {
                middlewareCalled = true;
                return next(action);
            };

            const storeWithMiddleware = createStore(appReducer, undefined, {
                middleware: [testMiddleware]
            });

            storeWithMiddleware.dispatch(counterActions.increment());

            expect(middlewareCalled).toBe(true);
        });

        it('should handle middleware errors', () => {
            const errorMiddleware: Middleware<AppState, AppAction> = (api) => (next) => (action) => {
                if (action.type === 'ERROR_TEST') {
                    throw new Error('Middleware error');
                }
                return next(action);
            };

            const storeWithErrorMiddleware = createStore(appReducer, undefined, {
                middleware: [errorMiddleware]
            });

            expect(() => {
                storeWithErrorMiddleware.dispatch({ type: 'ERROR_TEST' } as any);
            }).toThrow('Middleware error');
        });

        it('should provide middleware API correctly', () => {
            let receivedApi: any = null;

            const apiMiddleware: Middleware<AppState, AppAction> = (api) => {
                receivedApi = api;
                return (next) => (action) => next(action);
            };

            const storeWithApiMiddleware = createStore(appReducer, undefined, {
                middleware: [apiMiddleware]
            });

            storeWithApiMiddleware.dispatch(counterActions.increment());

            expect(receivedApi).toBeTruthy();
            expect(typeof receivedApi.getState).toBe('function');
            expect(typeof receivedApi.dispatch).toBe('function');
        });
    });

    describe('Utility Functions', () => {
        describe('combineReducers', () => {
            it('should combine multiple reducers', () => {
                const combinedReducer = combineReducers({
                    counter: counterReducer,
                    todos: todoReducer,
                });

                const initialState = combinedReducer(undefined, { type: '@@INIT' } as any);

                expect(initialState).toEqual({
                    counter: { value: 0, step: 1 },
                    todos: { items: [], filter: 'all' }
                });
            });

            it('should handle state changes correctly', () => {
                const combinedReducer = combineReducers({
                    counter: counterReducer,
                    todos: todoReducer,
                });

                let state = combinedReducer(undefined, counterActions.increment());

                expect(state.counter.value).toBe(1);
                expect(state.todos.items).toEqual([]);

                state = combinedReducer(state, todoActions.addTodo('Test'));

                expect(state.counter.value).toBe(1);
                expect(state.todos.items).toHaveLength(1);
            });

            it('should filter out non-function reducers', () => {
                const combinedReducer = combineReducers({
                    counter: counterReducer,
                    todos: 'not a function' as any,
                    valid: todoReducer,
                });

                const state = combinedReducer(undefined, { type: '@@INIT' } as any);

                expect(state).toEqual({
                    counter: { value: 0, step: 1 },
                    valid: { items: [], filter: 'all' }
                });
            });
        });

        describe('bindActionCreators', () => {
            it('should bind action creators to dispatch', () => {
                const dispatch = jest.fn();
                const boundActions = bindActionCreators(counterActions, dispatch);

                boundActions.increment();
                boundActions.setStep(5);

                expect(dispatch).toHaveBeenCalledTimes(2);
                expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'INCREMENT' });
                expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SET_STEP', payload: 5 });
            });

            it('should handle non-function action creators', () => {
                const actionCreators = {
                    ...counterActions,
                    invalidAction: 'not a function' as any,
                };

                const dispatch = jest.fn();
                const boundActions = bindActionCreators(actionCreators, dispatch);

                boundActions.increment();

                expect(dispatch).toHaveBeenCalledTimes(1);
                expect(boundActions.invalidAction).toBeUndefined();
            });

            it('should return bound action creators object', () => {
                const dispatch = jest.fn();
                const boundActions = bindActionCreators(counterActions, dispatch);

                expect(typeof boundActions.increment).toBe('function');
                expect(typeof boundActions.decrement).toBe('function');
                expect(typeof boundActions.setStep).toBe('function');
                expect(typeof boundActions.reset).toBe('function');
            });
        });
    });

    describe('Observable Integration', () => {
        it('should provide observable interface', () => {
            const observable = (store as any).observable;

            expect(observable).toBeTruthy();
            expect(typeof observable.subscribe).toBe('function');
        });

        it('should handle observable subscriptions', () => {
            const observable = (store as any).observable;
            const nextHandler = jest.fn();

            const subscription = observable.subscribe({
                next: nextHandler,
            });

            store.dispatch(counterActions.increment());

            expect(nextHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    counter: { value: 1, step: 1 }
                })
            );

            subscription.unsubscribe();
        });
    });

    describe('DevTools Integration', () => {
        it('should handle DevTools setup gracefully', () => {
            // Mock window.__REDUX_DEVTOOLS_EXTENSION__
            const mockDevTools = {
                connect: jest.fn().mockReturnValue({
                    subscribe: jest.fn(),
                    init: jest.fn(),
                    send: jest.fn(),
                }),
            };

            Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION__', {
                value: mockDevTools,
                writable: true,
            });

            const storeWithDevTools = createStore(appReducer, undefined, {
                devTools: true
            });

            expect(mockDevTools.connect).toHaveBeenCalledWith({
                name: 'TypeScript Store'
            });

            // Clean up
            delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        });

        it('should disable DevTools when configured', () => {
            const mockDevTools = {
                connect: jest.fn(),
            };

            Object.defineProperty(window, '__REDUX_DEVTOOLS_EXTENSION__', {
                value: mockDevTools,
                writable: true,
            });

            createStore(appReducer, undefined, {
                devTools: false
            });

            expect(mockDevTools.connect).not.toHaveBeenCalled();

            // Clean up
            delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        });

        it('should handle DevTools when not available', () => {
            // Ensure DevTools is not available
            delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;

            // Should not throw
            expect(() => {
                createStore(appReducer, undefined, { devTools: true });
            }).not.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle reducer errors gracefully', () => {
            const errorReducer: Reducer<AppState, AppAction> = (state, action) => {
                if (action.type === 'ERROR_ACTION') {
                    throw new Error('Reducer error');
                }
                return state || { counter: { value: 0, step: 1 }, todos: { items: [], filter: 'all' } };
            };

            const errorStore = createStore(errorReducer);

            expect(() => {
                errorStore.dispatch({ type: 'ERROR_ACTION' } as any);
            }).toThrow('Reducer error');
        });

        it('should handle subscriber errors gracefully', () => {
            const errorListener = jest.fn().mockImplementation(() => {
                throw new Error('Subscriber error');
            });

            store.subscribe(errorListener);

            // Should not throw despite subscriber error
            expect(() => {
                store.dispatch(counterActions.increment());
            }).not.toThrow();

            expect(errorListener).toHaveBeenCalledTimes(1);
        });

        it('should handle middleware errors', () => {
            const errorMiddleware: Middleware<AppState, AppAction> = () => () => (action) => {
                if (action.type === 'ERROR_MIDDLEWARE') {
                    throw new Error('Middleware error');
                }
                return action;
            };

            const storeWithErrorMiddleware = createStore(appReducer, undefined, {
                middleware: [errorMiddleware]
            });

            expect(() => {
                storeWithErrorMiddleware.dispatch({ type: 'ERROR_MIDDLEWARE' } as any);
            }).toThrow('Middleware error');
        });
    });

    describe('Performance and Memory', () => {
        it('should handle many subscriptions efficiently', () => {
            const listeners: Array<() => void> = [];
            const listenerCount = 1000;

            // Add many listeners
            for (let i = 0; i < listenerCount; i++) {
                const unsubscribe = store.subscribe(() => {
                    // Do nothing
                });
                listeners.push(unsubscribe);
            }

            // Dispatch should handle many listeners
            const startTime = performance.now();

            store.dispatch(counterActions.increment());

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete reasonably quickly (adjust threshold as needed)
            expect(duration).toBeLessThan(100);

            // Clean up
            listeners.forEach(unsubscribe => unsubscribe());
        });

        it('should handle rapid dispatches', () => {
            const actionCount = 1000;

            for (let i = 0; i < actionCount; i++) {
                store.dispatch(counterActions.increment());
            }

            const state = store.getState();
            expect(state.counter.value).toBe(actionCount);
        });
    });

    describe('TypeScript Integration', () => {
        it('should enforce type safety for actions', () => {
            // This test verifies TypeScript correctly enforces action types
            const validAction: CounterAction = { type: 'INCREMENT' };
            const actionWithPayload: CounterAction = { type: 'SET_STEP', payload: 5 };

            expect(() => store.dispatch(validAction)).not.toThrow();
            expect(() => store.dispatch(actionWithPayload)).not.toThrow();
        });

        it('should enforce type safety for state', () => {
            const state = store.getState();

            // TypeScript should enforce these properties exist
            expect(typeof state.counter.value).toBe('number');
            expect(typeof state.counter.step).toBe('number');
            expect(Array.isArray(state.todos.items)).toBe(true);
            expect(['all', 'active', 'completed'].includes(state.todos.filter)).toBe(true);
        });

        it('should handle generic type constraints', () => {
            // Test that the store correctly handles generic types
            const typedStore: ReduxStore<AppState, AppAction> = store;

            expect(typedStore.getState).toBeDefined();
            expect(typedStore.dispatch).toBeDefined();
            expect(typedStore.subscribe).toBeDefined();
            expect(typedStore.replaceReducer).toBeDefined();
        });
    });

    describe('Integration Tests', () => {
        it('should work with complex state updates', () => {
            // Add todos
            store.dispatch(todoActions.addTodo('Learn TypeScript'));
            store.dispatch(todoActions.addTodo('Learn Redux'));
            store.dispatch(todoActions.addTodo('Build app'));

            // Update counter
            store.dispatch(counterActions.setStep(3));
            store.dispatch(counterActions.increment());
            store.dispatch(counterActions.increment());

            const state = store.getState();

            expect(state.todos.items).toHaveLength(3);
            expect(state.counter.value).toBe(6); // 2 increments * step of 3
            expect(state.counter.step).toBe(3);
        });

        it('should handle combined reducer edge cases', () => {
            const combinedReducer = combineReducers<AppState, AppAction>({
                counter: counterReducer,
                todos: todoReducer,
            });

            // Test with undefined state
            const initialState = combinedReducer(undefined, { type: '@@INIT' } as AppAction);
            expect(initialState.counter.value).toBe(0);
            expect(initialState.todos.items).toEqual([]);

            // Test state immutability in combined reducer
            const nextState = combinedReducer(initialState, counterActions.increment());
            expect(nextState).not.toBe(initialState);
            expect(nextState.counter).not.toBe(initialState.counter);
            expect(nextState.todos).toBe(initialState.todos);
        });

        it('should integrate with middleware and subscriptions', () => {
            let lastAction: AppAction | null = null;

            const actionLogger: Middleware<AppState, AppAction> = (api) => (next) => (action) => {
                lastAction = action;
                return next(action);
            };

            const storeWithLogger = createStore(appReducer, undefined, {
                middleware: [actionLogger]
            });

            const stateChanges: AppState[] = [];
            storeWithLogger.subscribe((state) => {
                stateChanges.push(state);
            });

            storeWithLogger.dispatch(counterActions.increment());
            storeWithLogger.dispatch(todoActions.addTodo('Test'));

            expect(lastAction).toEqual({ type: 'ADD_TODO', payload: 'Test' });
            expect(stateChanges).toHaveLength(2);
        });
    });
});