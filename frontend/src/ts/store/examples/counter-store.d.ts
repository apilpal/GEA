export interface CounterState {
    value: number;
    loading: boolean;
    error: string | null;
}
export declare const CounterActionTypes: {
    readonly INCREMENT: "COUNTER_INCREMENT";
    readonly DECREMENT: "COUNTER_DECREMENT";
    readonly RESET: "COUNTER_RESET";
    readonly SET_VALUE: "COUNTER_SET_VALUE";
    readonly INCREMENT_ASYNC: "COUNTER_INCREMENT_ASYNC";
};
export declare const CounterActions: {
    increment: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_INCREMENT", any>>;
    decrement: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_DECREMENT", any>>;
    reset: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_RESET", any>>;
    setValue: (value: number) => import("../core").BaseAction<"COUNTER_SET_VALUE", any>;
    incrementAsync: {
        request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
        success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        cancel: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_INCREMENT_ASYNC", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_INCREMENT_ASYNC", any>>;
    };
};
export declare const CounterSelectors: {
    selectValue: (state: {
        counter: CounterState;
    }) => number;
    selectLoading: (state: {
        counter: CounterState;
    }) => boolean;
    selectError: (state: {
        counter: CounterState;
    }) => string | null;
    selectIsPositive: (state: {
        counter: CounterState;
    }) => boolean;
    selectIsZero: (state: {
        counter: CounterState;
    }) => boolean;
    selectDisplayValue: (state: {
        counter: CounterState;
    }) => string;
};
export declare const CounterThunks: {
    incrementAsync: (delay?: number) => (dispatch: any) => Promise<void>;
    incrementMultiple: (times: number, delay?: number) => (dispatch: any) => Promise<void>;
};
export declare function createCounterStore(): import("@/ts/store/core/store").ReduxStore<CounterState, import("../core").BaseAction<string, any>>;
export declare const CounterStore: {
    actions: {
        increment: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_INCREMENT", any>>;
        decrement: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_DECREMENT", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_RESET", any>>;
        setValue: (value: number) => import("../core").BaseAction<"COUNTER_SET_VALUE", any>;
        incrementAsync: {
            request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
            success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
            failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
            cancel: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_INCREMENT_ASYNC", any>>;
            reset: import("../core").ActionCreator<import("../core").BaseAction<"COUNTER_INCREMENT_ASYNC", any>>;
        };
    };
    thunks: {
        incrementAsync: (delay?: number) => (dispatch: any) => Promise<void>;
        incrementMultiple: (times: number, delay?: number) => (dispatch: any) => Promise<void>;
    };
    selectors: {
        selectValue: (state: {
            counter: CounterState;
        }) => number;
        selectLoading: (state: {
            counter: CounterState;
        }) => boolean;
        selectError: (state: {
            counter: CounterState;
        }) => string | null;
        selectIsPositive: (state: {
            counter: CounterState;
        }) => boolean;
        selectIsZero: (state: {
            counter: CounterState;
        }) => boolean;
        selectDisplayValue: (state: {
            counter: CounterState;
        }) => string;
    };
    reducer: import("../core").Reducer<CounterState, import("../core").BaseAction<string, any>>;
    createStore: typeof createCounterStore;
};
//# sourceMappingURL=counter-store.d.ts.map