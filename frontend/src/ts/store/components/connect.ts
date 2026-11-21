import { BaseComponent, ComponentProps, ComponentState } from '@/ts/components/core/base-component';
import { Store, BaseAction, Selector, Dispatch } from '@/ts/types/store';
import { createSelector } from '@/ts/store/core/selectors-simple';

/**
 * Props that are passed to connected components
 */
export interface ConnectedComponentProps<TState = any, TOwnProps = any> {
    /** Current state from the store */
    state: TState;
    /** Dispatch function for sending actions */
    dispatch: Dispatch<BaseAction>;
    /** Own props passed to the component */
    ownProps: TOwnProps;
}

/**
 * Options for connecting a component to the store
 */
export interface ConnectOptions<TState = any, TOwnProps = any> {
    /** Selector functions to extract data from state */
    selectors?: Array<Selector<TState, any>>;
    /** Whether to subscribe to store changes (default: true) */
    subscribe?: boolean;
    /** Custom comparison function for optimizing renders */
    shouldComponentUpdate?: (prevProps: ConnectedComponentProps<TState, TOwnProps>, nextProps: ConnectedComponentProps<TState, TOwnProps>) => boolean;
}

/**
 * Higher-order component that connects a BaseComponent to the Redux store
 */
export function connect<TState = any, TOwnProps = any, TComponentProps = any>(
    store: Store<TState, BaseAction>,
    options: ConnectOptions<TState, TOwnProps> = {}
) {
    const { selectors = [], subscribe = true, shouldComponentUpdate } = options;

    return function <T extends ComponentProps, U extends ComponentState>(
        ComponentClass: new (props?: T, metadata?: any) => BaseComponent<T, U> & {
            performRender(): void;
            getProps(): T;
            getState(): U;
        }
    ) {
        return class extends BaseComponent<T & ConnectedComponentProps<TState, TOwnProps>, U> {
            protected store = store;
            protected unsubscribe?: () => void;
            protected lastProps?: ConnectedComponentProps<TState, TOwnProps>;

            constructor(props?: T & ConnectedComponentProps<TState, TOwnProps>, metadata?: any) {
                super(props, metadata);

                // Initialize component props with store connection
                this.initializeStoreConnection();
            }

            private initializeStoreConnection() {
                // Subscribe to store changes if enabled
                if (subscribe) {
                    this.unsubscribe = this.store.subscribe(() => {
                        this.onStoreChange();
                    });
                }

                // Initialize props with current store state
                this.updateConnectedProps();
            }

            private onStoreChange() {
                const newProps = this.createConnectedProps();

                if (shouldComponentUpdate) {
                    if (shouldComponentUpdate(this.lastProps!, newProps)) {
                        this.lastProps = newProps;
                        this.updateConnectedProps();
                    }
                } else {
                    this.lastProps = newProps;
                    this.updateConnectedProps();
                }
            }

            private updateConnectedProps() {
                const connectedProps = this.createConnectedProps();

                // Merge connected props with own props
                const mergedProps = {
                    ...this.props,
                    ...connectedProps
                } as T & ConnectedComponentProps<TState, TOwnProps>;

                this.props = mergedProps;
                this.markForRender();
            }

            private createConnectedProps(): ConnectedComponentProps<TState, TOwnProps> {
                const state = this.store.getState();

                // Apply selectors to extract relevant data
                const selectedState = selectors.length > 0
                    ? createSelector(
                        selectors,
                        (...results: any[]) => {
                            return results.length === 1 ? results[0] : results;
                        }
                    )(state)
                    : state;

                return {
                    state: selectedState,
                    dispatch: this.store.dispatch,
                    ownProps: this.extractOwnProps()
                };
            }

            private extractOwnProps(): TOwnProps {
                // Extract non-connected props
                const { state, dispatch, ...ownProps } = this.props as any;
                return ownProps as TOwnProps;
            }

            protected setupEventListeners(): void {
                // Component-specific event listeners are set up by subclasses
                // through the normal inheritance mechanism
            }

            protected performRender(): void {
                // Render logic is implemented by the wrapped component
                // This is a pass-through that allows the wrapped component to render
                // with the connected props
            }

            protected cleanup(): void {
                // Unsubscribe from store when component is destroyed
                if (this.unsubscribe) {
                    this.unsubscribe();
                }
                super.cleanup();
            }
        };
    };
}

/**
 * Decorator version of connect for class-based components
 */
export function Connect<TState = any, TOwnProps = any>(
    store: Store<TState, BaseAction>,
    options?: ConnectOptions<TState, TOwnProps>
) {
    return function <T extends new (...args: any[]) => any>(ComponentClass: T) {
        return connect(store, options)(ComponentClass as any);
    };
}

/**
 * Functional component connector for non-class components
 */
export function useStore<TState = any, TSelected = any>(
    store: Store<TState, BaseAction>,
    selector?: Selector<TState, TSelected>
) {
    return {
        state: selector ? selector(store.getState()) : store.getState(),
        dispatch: store.dispatch,
        subscribe: (callback: () => void) => {
            return store.subscribe(callback);
        }
    };
}

/**
 * Utility functions for connected components
 */
export const ConnectUtils = {
    /**
     * Creates a selector that extracts a specific slice of state
     */
    createSliceSelector: <TState, TSlice>(
        sliceSelector: (state: TState) => TSlice
    ) => sliceSelector,

    /**
     * Combines multiple selectors for a connected component
     */
    combineSelectors: <TState, TResult extends Record<string, any>>(
        selectors: {
            [K in keyof TResult]: Selector<TState, TResult[K]>
        }
    ) => {
        return createSelector(
            Object.values(selectors),
            (...results: any[]) => {
                return Object.keys(selectors).reduce((combined, key, index) => {
                    (combined as any)[key] = results[index];
                    return combined;
                }, {} as TResult);
            }
        );
    },

    /**
     * Creates a memoized selector for expensive computations
     */
    createMemoizedSelector: <TState, TArgs extends any[], TResult>(
        inputSelectors: Array<Selector<TState, any>>,
        resultFn: (...args: TArgs) => TResult
    ) => {
        return createSelector(inputSelectors, resultFn);
    }
};

/**
 * Common selector patterns for connected components
 */
export const CommonConnectedSelectors = {
    /**
     * Selects loading state for a specific feature
     */
    selectLoading: <TState>(loadingKey: keyof TState) => (state: TState): boolean =>
        (state[loadingKey] as any)?.loading || false,

    /**
     * Selects error state for a specific feature
     */
    selectError: <TState>(errorKey: keyof TState) => (state: TState): string | null =>
        (state[errorKey] as any)?.error?.message || null,

    /**
     * Selects data for a specific feature
     */
    selectData: <TState, TData>(dataKey: keyof TState) => (state: TState): TData | null =>
        (state[dataKey] as any)?.data || null,

    /**
     * Selects all entities from a normalized state slice
     */
    selectAllEntities: <TState, TEntity>(
        entitiesKey: keyof TState
    ) => (state: TState): Record<string, TEntity> =>
        (state[entitiesKey] as any)?.entities || {},

    /**
     * Selects entities by IDs from a normalized state slice
     */
    selectEntitiesByIds: <TState, TEntity>(
        entitiesKey: keyof TState,
        idsKey: keyof TState
    ) => (state: TState): TEntity[] => {
        const entities = (state[entitiesKey] as any)?.entities || {};
        const ids = (state[idsKey] as any) || [];
        return ids.map((id: string) => entities[id]).filter(Boolean);
    }
};