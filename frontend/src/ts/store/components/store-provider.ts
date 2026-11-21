import { BaseComponent, ComponentProps, BaseComponentProps } from '@/ts/components/core/base-component';
import { Store, BaseAction } from '@/ts/types/store';

/**
 * Props for the StoreProvider component
 */
export interface StoreProviderProps extends BaseComponentProps {
    /** The Redux store instance */
    store: Store<any, BaseAction>;
    /** Child elements to render */
    children?: any;
    /** Context key for storing the store (default: 'store') */
    contextKey?: string;
}

/**
 * Component that provides a Redux store to child components
 */
export class StoreProvider extends BaseComponent<StoreProviderProps> {
    private static storeInstances = new Map<string, Store<any, BaseAction>>();

    static getStore(contextKey: string = 'store'): Store<any, BaseAction> | undefined {
        return StoreProvider.storeInstances.get(contextKey);
    }

    static setStore(store: Store<any, BaseAction>, contextKey: string = 'store'): void {
        StoreProvider.storeInstances.set(contextKey, store);
    }

    static clearStore(contextKey: string = 'store'): void {
        StoreProvider.storeInstances.delete(contextKey);
    }

    constructor(props?: StoreProviderProps) {
        super(props);
    }

    protected getDefaultProps(): Partial<StoreProviderProps> {
        return {
            contextKey: 'store'
        };
    }

    protected initializeComponent(): void {
        super.initializeComponent();

        // Store the store instance for child components to access
        if (this.props.store && this.props.contextKey) {
            StoreProvider.setStore(this.props.store, this.props.contextKey);
        }
    }

    protected setupEventListeners(): void {
        // No event listeners needed for provider
    }

    protected performRender(): void {
        // Provider doesn't render anything itself, just provides context
        // Child components will be rendered by the parent renderer
    }

    protected cleanup(): void {
        // Clean up store instance when provider is destroyed
        if (this.props.contextKey) {
            StoreProvider.clearStore(this.props.contextKey);
        }
        super.cleanup();
    }
}

/**
 * Higher-order component that injects the store into a component
 */
export function withStore<TState = any, TAction extends BaseAction = BaseAction>(
    contextKey: string = 'store'
) {
    return function <T extends ComponentProps>(
        ComponentClass: new (props?: T) => BaseComponent<T> & {
            performRender(): void;
            store?: Store<TState, TAction>;
        }
    ) {
        return class extends ComponentClass {
            public store?: Store<TState, TAction>;

            constructor(props?: T) {
                super(props);

                // Inject store into component
                this.store = StoreProvider.getStore(contextKey) as Store<TState, TAction>;

                if (!this.store) {
                    console.warn(`Store with key "${contextKey}" not found. Make sure StoreProvider is rendered.`);
                }
            }

            protected performRender(): void {
                // Call original render method
                super.performRender();
            }
        } as any;
    };
}

/**
 * Utility functions for store provider management
 */
export const StoreProviderUtils = {
    /**
     * Gets a store instance by key
     */
    getStore: <TState = any, TAction extends BaseAction = BaseAction>(
        contextKey: string = 'store'
    ): Store<TState, TAction> | undefined => {
        return StoreProvider.getStore(contextKey) as Store<TState, TAction>;
    },

    /**
     * Sets a store instance by key
     */
    setStore: <TState = any, TAction extends BaseAction = BaseAction>(
        store: Store<TState, TAction>,
        contextKey: string = 'store'
    ): void => {
        StoreProvider.setStore(store as Store<any, BaseAction>, contextKey);
    },

    /**
     * Creates a store provider element
     */
    createProvider: (
        store: Store<any, BaseAction>,
        children?: Node,
        contextKey: string = 'store'
    ): StoreProvider => {
        return new StoreProvider({
            store,
            children,
            contextKey
        });
    },

    /**
     * Creates a multi-store provider for complex applications
     */
    createMultiProvider: (
        stores: Record<string, Store<any, BaseAction>>,
        children?: Node
    ): StoreProvider => {
        // Create nested providers for multiple stores
        let currentChildren = children;

        // Create providers in reverse order so they nest properly
        const storeKeys = Object.keys(stores);
        for (let i = storeKeys.length - 1; i >= 0; i--) {
            const key = storeKeys[i];
            const provider = new StoreProvider({
                store: stores[key],
                contextKey: key
            } as StoreProviderProps);
            currentChildren = [provider as any];
        }

        return currentChildren?.[0] as StoreProvider;
    }
};

/**
 * React-like context implementation for store sharing
 */
export class StoreContext {
    protected static contexts = new Map<string, StoreContext>();
    protected listeners = new Set<() => void>();
    protected currentStore?: Store<any, BaseAction>;

    static getContext(key: string = 'store'): StoreContext {
        if (!StoreContext.contexts.has(key)) {
            StoreContext.contexts.set(key, new StoreContext());
        }
        return StoreContext.contexts.get(key)!;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    getStore(): Store<any, BaseAction> | undefined {
        return this.currentStore;
    }

    setStore(store: Store<any, BaseAction>): void {
        this.currentStore = store;
        this.notifyListeners();
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => {
            try {
                listener();
            } catch (error) {
                console.error('Error in store context listener:', error);
            }
        });
    }
}

/**
 * Hook for accessing store context (works with React-like libraries)
 */
export function useStoreContext<TState = any, TAction extends BaseAction = BaseAction>(
    contextKey: string = 'store'
): Store<TState, TAction> | undefined {
    const context = StoreContext.getContext(contextKey);

    // Simple implementation - in a real React-like library this would use useState/useEffect
    let currentStore = context.getStore() as Store<TState, TAction>;

    // Subscribe to changes
    const [, forceUpdate] = useSimpleState(0);

    useSimpleEffect(() => {
        return context.subscribe(() => {
            forceUpdate(1);
        });
    }, []);

    return currentStore;
}

/**
 * Simple state and effect hooks for the context (fallback implementation)
 */
function useSimpleState<T>(initialValue: T): [T, (newValue: T) => void] {
    let state = initialValue;
    const setState = (newValue: T) => {
        state = newValue;
        // Force update logic would go here
    };
    return [state, setState];
}

function useSimpleEffect(callback: () => void | (() => void), deps?: any[]): void {
    // Effect logic would go here
}