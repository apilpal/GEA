# Store System API Documentation

## Overview

The Store System provides a Redux-like state management solution with full TypeScript support, middleware integration, and DevTools compatibility.

## Core Concepts

### Store

The central state container that manages application state.

```typescript
import { createStore, ReduxStore } from './store/core/store';

// Create a store
const store = createStore(rootReducer, initialState, config);
```

### Actions

Plain objects that describe state changes.

```typescript
import { BaseAction } from './store/core/types';

interface CounterAction extends BaseAction {
    type: 'INCREMENT' | 'DECREMENT';
    payload: number;
}
```

### Reducers

Pure functions that specify how state changes in response to actions.

```typescript
import { Reducer } from './store/core/types';

const counterReducer: Reducer<number, CounterAction> = (state = 0, action) => {
    switch (action.type) {
        case 'INCREMENT':
            return state + action.payload;
        case 'DECREMENT':
            return state - action.payload;
        default:
            return state;
    }
};
```

## API Reference

### createStore

Creates a Redux store with optional configuration.

```typescript
function createStore<TState, TAction extends BaseAction>(
    reducer: Reducer<TState, TAction>,
    initialState?: TState,
    config?: StoreConfig<TState>
): ReduxStore<TState, TAction>
```

**Parameters:**
- `reducer`: Function that specifies how state changes
- `initialState`: Initial state value (optional)
- `config`: Store configuration options (optional)

**Configuration Options:**
```typescript
interface StoreConfig<TState> {
    middleware?: Array<Middleware<TState, TAction>>;
    devTools?: boolean;
    enhancers?: Array<StoreEnhancer<TState>>;
}
```

### ReduxStore Methods

#### getState()

Returns the current state tree.

```typescript
const state = store.getState(): TState
```

#### dispatch(action)

Dispatches an action to update the state.

```typescript
const action = { type: 'INCREMENT', payload: 1 };
store.dispatch(action): TAction
```

#### subscribe(listener)

Subscribes to store changes.

```typescript
const unsubscribe = store.subscribe((newState: TState, oldState: TState) => {
    console.log('State changed:', newState);
});
```

#### replaceReducer(nextReducer)

Replaces the store's reducer.

```typescript
store.replaceReducer(newReducer);
```

## Middleware API

### Using Middleware

```typescript
import { createStore } from './store/core/store';
import { logger, thunk, promise } from './store/middleware';

const store = createStore(rootReducer, initialState, {
    middleware: [logger, thunk, promise]
});
```

### Custom Middleware

```typescript
import { Middleware, MiddlewareAPI, Dispatch } from './store/core/types';

export const customMiddleware: Middleware<TState, TAction> = (api: MiddlewareAPI<TState, TAction>) => {
    return (next: Dispatch<TAction>) => (action: TAction) => {
        console.log('Dispatching:', action);

        const result = next(action);

        console.log('Next state:', api.getState());

        return result;
    };
};
```

### Available Middleware

#### Logger Middleware

Logs all actions and state changes.

```typescript
import { logger } from './store/middleware/logger';
```

#### Thunk Middleware

Enables async actions using thunk functions.

```typescript
import { thunk } from './store/middleware/thunk';

// Usage in actions
const fetchData = () => async (dispatch: Dispatch, getState: () => TState) => {
    dispatch({ type: 'FETCH_START' });

    try {
        const data = await api.fetchData();
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
        dispatch({ type: 'FETCH_ERROR', payload: error });
    }
};
```

#### Promise Middleware

Handles promise-based actions automatically.

```typescript
import { promise } from './store/middleware/promise';

// Action format
{
    type: 'ASYNC_ACTION',
    payload: Promise.resolve(data)
}
```

#### Error Handler Middleware

Catches and handles errors in actions and reducers.

```typescript
import { errorHandler } from './store/middleware/error-handler';
```

## Selectors API

### Creating Selectors

```typescript
import { createSelector } from './store/core/selectors';

const getUsers = (state: AppState) => state.users.items;
const getActiveUsers = createSelector(
    [getUsers],
    (users) => users.filter(user => user.active)
);
```

### Using Selectors

```typescript
// In components
const activeUsers = getActiveUsers(store.getState());
```

## DevTools Integration

### Redux DevTools

Automatically integrates with Redux DevTools when available.

```typescript
const store = createStore(reducer, initialState, {
    devTools: true // Enabled by default
});
```

### Time Travel Debugging

- Use Redux DevTools to inspect actions
- Jump to previous states
- Replay actions
- Import/export store history

## Observable Integration

### RxJS Support

```typescript
import { Observable } from 'rxjs';

const state$ = new Observable<TState>(subscriber => {
    const unsubscribe = store.subscribe((state) => {
        subscriber.next(state);
    });

    return unsubscribe;
});

// Usage with RxJS operators
state$
    .map(state => state.users)
    .filter(users => users.length > 0)
    .subscribe(users => console.log('Users:', users));
```

## Testing Utilities

### Store Testing

```typescript
import { createMockStore } from './store/utils/testing';

const mockStore = createMockStore(initialState);

// Test actions
mockStore.dispatch({ type: 'TEST_ACTION' });
expect(mockStore.getState()).toEqual(expectedState);
```

### Action Testing

```typescript
import { expectAction } from './store/utils/testing';

const action = { type: 'INCREMENT', payload: 1 };
expectAction.toDispatch(action, expectedNewState);
```

## Best Practices

### TypeScript Usage

```typescript
// Define action types clearly
type ActionTypes = 'INCREMENT' | 'DECREMENT' | 'RESET';

interface AppAction extends BaseAction {
    type: ActionTypes;
    payload?: number;
}

// Use strict typing
const reducer: Reducer<AppState, AppAction> = (state, action) => {
    // TypeScript will enforce exhaustive checking
    switch (action.type) {
        case 'INCREMENT':
            return { ...state, count: state.count + (action.payload || 1) };
        case 'DECREMENT':
            return { ...state, count: state.count - (action.payload || 1) };
        case 'RESET':
            return { ...state, count: 0 };
        default:
            return state;
    }
};
```

### Error Handling

```typescript
// In actions
export const fetchData = () => async (dispatch: Dispatch) => {
    dispatch({ type: 'FETCH_START' });

    try {
        const data = await apiCall();
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
        dispatch({ type: 'FETCH_ERROR', payload: error });
    }
};

// In reducers
const reducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'FETCH_ERROR':
            return {
                ...state,
                error: action.payload,
                loading: false
            };
        default:
            return state;
    }
};
```

### Performance Optimization

```typescript
// Use selectors for computed values
const getVisibleTodos = createSelector(
    [getTodos, getFilter],
    (todos, filter) => {
        switch (filter) {
            case 'SHOW_COMPLETED':
                return todos.filter(t => t.completed);
            case 'SHOW_ACTIVE':
                return todos.filter(t => !t.completed);
            default:
                return todos;
        }
    }
);

// Memoize expensive computations
const getFilteredData = createSelector(
    [getRawData, getFilters],
    (data, filters) => expensiveFiltering(data, filters)
);
```

## Examples

### Counter Example

See `frontend/src/ts/store/examples/counter-store.ts` for a complete counter example.

### Todo List Example

See `frontend/src/ts/store/examples/todo-store.ts` for a complete todo list example.

### Integration with Components

```typescript
import { connect } from './store/components/connect';

interface CounterProps {
    count: number;
    onIncrement: () => void;
    onDecrement: () => void;
}

const CounterComponent = connect(
    (state) => ({ count: state.counter.value }),
    (dispatch) => ({
        onIncrement: () => dispatch({ type: 'INCREMENT' }),
        onDecrement: () => dispatch({ type: 'DECREMENT' })
    })
)(CounterComponent);