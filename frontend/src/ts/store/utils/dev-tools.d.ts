import { Store, BaseAction } from '@/ts/types/store';
export interface DevToolsConfig {
    name?: string;
    trace?: boolean;
    traceLimit?: number;
    serialize?: {
        replacer?: (key: string, value: any) => any;
        reviver?: (key: string, value: any) => any;
    };
}
export declare class DevToolsStore<TState = any, TAction extends BaseAction = BaseAction> {
    private store;
    private devTools?;
    private config;
    constructor(store: Store<TState, TAction>, config?: DevToolsConfig);
    private initializeDevTools;
    private handleDevToolsMessage;
    getStore(): Store<TState, TAction>;
    dispatch(action: TAction): TAction;
    getState(): TState;
    subscribe(listener: (state: TState, prevState: TState) => void): () => void;
}
export declare function createDevToolsStore<TState, TAction extends BaseAction = BaseAction>(store: Store<TState, TAction>, config?: DevToolsConfig): DevToolsStore<TState, TAction>;
export declare const DevToolsUtils: {
    logState: <TState>(store: Store<TState, BaseAction>) => void;
    logAction: (action: BaseAction) => void;
    createActionLogger: () => (store: any) => (next: any) => (action: BaseAction) => any;
    createStateTracker: <TState>(store: Store<TState, BaseAction>) => {
        trackChanges: (callback?: (changes: {
            previous: TState;
            current: TState;
            action?: BaseAction;
        }) => void) => import("@/ts/store/core/types").Unsubscribe;
        getPreviousState: () => TState | undefined;
    };
    createStoreInspector: <TState, TAction extends BaseAction>(store: Store<TState, TAction>) => {
        inspect: () => {
            state: TState;
            actionCount: number;
            listenersCount: number;
            reducer: string;
        };
        exportState: () => string;
        importState: (stateJson: string) => boolean;
    };
};
export declare const DevStoreEnhancers: {
    withImmutabilityCheck: <TState, TAction extends BaseAction>(store: Store<TState, TAction>) => Store<TState, TAction>;
    withActionValidation: <TState, TAction extends BaseAction>(store: Store<TState, TAction>, validator?: (action: TAction) => boolean | string) => Store<TState, TAction>;
};
//# sourceMappingURL=dev-tools.d.ts.map