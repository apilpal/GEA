import { BaseComponent, ComponentProps, BaseComponentProps } from '@/ts/components/core/base-component';
import { Store, BaseAction } from '@/ts/types/store';
export interface StoreProviderProps extends BaseComponentProps {
    store: Store<any, BaseAction>;
    children?: any;
    contextKey?: string;
}
export declare class StoreProvider extends BaseComponent<StoreProviderProps> {
    private static storeInstances;
    static getStore(contextKey?: string): Store<any, BaseAction> | undefined;
    static setStore(store: Store<any, BaseAction>, contextKey?: string): void;
    static clearStore(contextKey?: string): void;
    constructor(props?: StoreProviderProps);
    protected getDefaultProps(): Partial<StoreProviderProps>;
    protected initializeComponent(): void;
    protected setupEventListeners(): void;
    protected performRender(): void;
    protected cleanup(): void;
}
export declare function withStore<TState = any, TAction extends BaseAction = BaseAction>(contextKey?: string): <T extends ComponentProps>(ComponentClass: new (props?: T) => BaseComponent<T> & {
    performRender(): void;
    store?: Store<TState, TAction>;
}) => any;
export declare const StoreProviderUtils: {
    getStore: <TState = any, TAction extends BaseAction = BaseAction<string, any>>(contextKey?: string) => Store<TState, TAction> | undefined;
    setStore: <TState = any, TAction extends BaseAction = BaseAction<string, any>>(store: Store<TState, TAction>, contextKey?: string) => void;
    createProvider: (store: Store<any, BaseAction>, children?: Node, contextKey?: string) => StoreProvider;
    createMultiProvider: (stores: Record<string, Store<any, BaseAction>>, children?: Node) => StoreProvider;
};
export declare class StoreContext {
    protected static contexts: Map<string, StoreContext>;
    protected listeners: Set<() => void>;
    protected currentStore?: Store<any, BaseAction>;
    static getContext(key?: string): StoreContext;
    subscribe(listener: () => void): () => void;
    getStore(): Store<any, BaseAction> | undefined;
    setStore(store: Store<any, BaseAction>): void;
    private notifyListeners;
}
export declare function useStoreContext<TState = any, TAction extends BaseAction = BaseAction>(contextKey?: string): Store<TState, TAction> | undefined;
//# sourceMappingURL=store-provider.d.ts.map