import { createStore, combineReducers } from '@/ts/store/core/store';
import { createAction, createAsyncAction } from '@/ts/store/core/actions';
import { createReducer } from '@/ts/store/core/reducers';
import { createSelector } from '@/ts/store/core/selectors-simple';

/**
 * Counter state interface
 */
export interface CounterState {
    value: number;
    loading: boolean;
    error: string | null;
}

/**
 * Initial counter state
 */
const initialCounterState: CounterState = {
    value: 0,
    loading: false,
    error: null
};

/**
 * Counter action types
 */
export const CounterActionTypes = {
    INCREMENT: 'COUNTER_INCREMENT',
    DECREMENT: 'COUNTER_DECREMENT',
    RESET: 'COUNTER_RESET',
    SET_VALUE: 'COUNTER_SET_VALUE',
    INCREMENT_ASYNC: 'COUNTER_INCREMENT_ASYNC'
} as const;

/**
 * Counter actions
 */
export const CounterActions = {
    increment: createAction(CounterActionTypes.INCREMENT),
    decrement: createAction(CounterActionTypes.DECREMENT),
    reset: createAction(CounterActionTypes.RESET),
    setValue: (value: number) => createAction(CounterActionTypes.SET_VALUE)(value),
    incrementAsync: createAsyncAction('COUNTER_INCREMENT_ASYNC')
};

/**
 * Counter selectors
 */
export const CounterSelectors = {
    /**
     * Selects the current counter value
     */
    selectValue: (state: { counter: CounterState }): number => state.counter.value,

    /**
     * Selects the loading state
     */
    selectLoading: (state: { counter: CounterState }): boolean => state.counter.loading,

    /**
     * Selects the error state
     */
    selectError: (state: { counter: CounterState }): string | null => state.counter.error,

    /**
     * Selects whether the counter is positive
     */
    selectIsPositive: (state: { counter: CounterState }): boolean => state.counter.value > 0,

    /**
     * Selects whether the counter is zero
     */
    selectIsZero: (state: { counter: CounterState }): boolean => state.counter.value === 0,

    /**
     * Selects a formatted display value
     */
    selectDisplayValue: (state: { counter: CounterState }): string => `Count: ${state.counter.value}`
};

/**
 * Counter reducer
 */
const counterReducer = createReducer(initialCounterState, {
    [CounterActionTypes.INCREMENT]: (state) => ({
        ...state,
        value: state.value + 1,
        error: null
    }),
    [CounterActionTypes.DECREMENT]: (state) => ({
        ...state,
        value: state.value - 1,
        error: null
    }),
    [CounterActionTypes.RESET]: (state) => ({
        ...state,
        value: 0,
        error: null
    }),
    [CounterActionTypes.SET_VALUE]: (state, action) => ({
        ...state,
        value: (action as any).payload as number,
        error: null
    }),
    'COUNTER_INCREMENT_ASYNC_REQUEST': (state) => ({
        ...state,
        loading: true,
        error: null
    }),
    'COUNTER_INCREMENT_ASYNC_SUCCESS': (state) => ({
        ...state,
        loading: false,
        value: state.value + 1,
        error: null
    }),
    'COUNTER_INCREMENT_ASYNC_FAILURE': (state, action) => ({
        ...state,
        loading: false,
        error: (action as any).payload as string
    })
});

/**
 * Counter thunks for async operations
 */
export const CounterThunks = {
    /**
     * Increments the counter after a delay
     */
    incrementAsync: (delay: number = 1000) => async (dispatch: any) => {
        dispatch(CounterActions.incrementAsync.request(delay));

        try {
            await new Promise(resolve => setTimeout(resolve, delay));
            dispatch(CounterActions.incrementAsync.success(delay));
        } catch (error) {
            dispatch(CounterActions.incrementAsync.failure(error as Error));
        }
    },

    /**
     * Increments counter multiple times
     */
    incrementMultiple: (times: number, delay: number = 100) => async (dispatch: any) => {
        for (let i = 0; i < times; i++) {
            await new Promise(resolve => setTimeout(resolve, delay));
            dispatch(CounterActions.increment());
        }
    }
};

/**
 * Creates a counter store instance
 */
export function createCounterStore() {
    return createStore(counterReducer, initialCounterState, {
        devTools: true,
        middleware: [
            // Add logger in development
            process.env.NODE_ENV === 'development' ?
                require('../middleware/logger').logger : undefined
        ].filter(Boolean)
    });
}

/**
 * Complete counter store with actions, reducers, and selectors
 */
export const CounterStore = {
    actions: CounterActions,
    thunks: CounterThunks,
    selectors: CounterSelectors,
    reducer: counterReducer,
    createStore: createCounterStore
};