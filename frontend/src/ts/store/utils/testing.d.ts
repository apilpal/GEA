import { Store, BaseAction, Reducer } from '@/ts/types/store';
export interface TestStore<TState = any, TAction extends BaseAction = BaseAction> {
    store: Store<TState, TAction>;
    dispatch: (action: TAction) => TAction;
    getState: () => TState;
    subscribe: (listener: (state: TState) => void) => () => void;
    reset: () => void;
    getActions: () => TAction[];
    clearActions: () => void;
}
export declare function createTestStore<TState, TAction extends BaseAction = BaseAction>(reducer: Reducer<TState, TAction>, initialState?: TState, middleware?: Array<any>): TestStore<TState, TAction>;
export declare const TestActionHelpers: {
    waitForAction: <TAction extends BaseAction>(store: Store<any, TAction>, actionType: TAction["type"], timeout?: number) => Promise<TAction>;
    expectAction: <TAction extends BaseAction>(actions: TAction[], actionType: TAction["type"]) => TAction;
    expectNoActions: (actions: BaseAction[]) => void;
};
export declare const TestStateHelpers: {
    expectState: <TState>(actualState: TState, expectedState: TState) => void;
    expectStateToContain: <TState extends Record<string, any>>(actualState: TState, expectedValues: Partial<TState>) => void;
    expectStateChanged: <TState>(previousState: TState, currentState: TState) => void;
    expectStateUnchanged: <TState>(previousState: TState, currentState: TState) => void;
};
export declare const TestMocks: {
    createMockStore: <TState, TAction extends BaseAction>(initialState: TState) => {
        store: Store<TState, TAction>;
        dispatch: jest.Mock;
        getState: jest.Mock;
        subscribe: jest.Mock;
    };
    createMockAction: <T extends string, P = any>(type: T, payload?: P) => BaseAction<T, P>;
    createMockReducer: <TState, TAction extends BaseAction>(defaultState: TState) => Reducer<TState, TAction>;
};
export declare const TestIntegrationHelpers: {
    testReduxFlow: <TState, TAction extends BaseAction>(store: Store<TState, TAction>, actions: TAction[], expectedStateChanges: Array<(state: TState) => boolean>, options?: {
        timeout?: number;
        expectExactState?: boolean;
    }) => Promise<void>;
    testAsyncFlow: <TState, TAction extends BaseAction>(store: Store<TState, TAction>, asyncAction: () => Promise<any>, expectedActions: TAction["type"][], options?: {
        timeout?: number;
        checkOrder?: boolean;
    }) => Promise<TAction[]>;
};
export declare const TestPerformanceHelpers: {
    measureDispatchTime: <TState, TAction extends BaseAction>(store: Store<TState, TAction>, actions: TAction[], iterations?: number) => Promise<number>;
    stressTest: <TState, TAction extends BaseAction>(store: Store<TState, TAction>, actionGenerator: () => TAction, actionCount?: number) => Promise<{
        totalTime: number;
        averageTime: number;
        actionsPerSecond: number;
        finalState: TState;
    }>;
};
export declare const ReduxMatchers: {
    toDispatchAction: (actions: BaseAction[], expectedAction: BaseAction) => {
        pass: boolean;
        message: () => string;
    };
    toHaveStateChanged: (previousState: any, currentState: any) => {
        pass: boolean;
        message: () => string;
    };
};
export declare const TestSetup: {
    createTestStoreFactory: <TState, TAction extends BaseAction>(reducer: Reducer<TState, TAction>, initialState?: TState) => () => TestStore<TState, TAction>;
    createTestDataGenerator: <T>(generatorFn: () => T) => {
        generate: () => T;
        generateMany: (count: number) => T[];
    };
};
//# sourceMappingURL=testing.d.ts.map