// Base Component class for standardized component APIs

/**
 * Utility types for component metadata and configuration
 */
export interface ComponentMetadata {
    readonly tagName: string;
    readonly version: string;
    readonly description?: string;
}

/**
 * Base props interface that all components can extend
 */
export interface BaseComponentProps {
    id?: string;
    className?: string;
    disabled?: boolean;
    hidden?: boolean;
}

/**
 * Base state interface that all components can extend
 */
export interface BaseComponentState {
    isLoading?: boolean;
    hasError?: boolean;
    errorMessage?: string;
}

/**
 * Component name type using template literal types
 */
export type ComponentName<T extends string = string> = T extends `${string}-${string}`
    ? T
    : never;

/**
 * Conditional type for component props - ensures props extend BaseComponentProps
 */
export type ComponentProps<T = BaseComponentProps> = T extends BaseComponentProps
    ? T
    : BaseComponentProps & T;

/**
 * Conditional type for component state - ensures state extends BaseComponentState
 */
export type ComponentState<T = BaseComponentState> = T extends BaseComponentState
    ? T
    : BaseComponentState & T;

/**
 * Event map type for type-safe event handling
 */
export type ComponentEventMap = Record<string, Event>;

/**
 * Generic props type that allows for optional props
 */
export type OptionalProps<T> = {
    [K in keyof T]?: T[K];
};

/**
 * Type-safe event handler type
 */
export type EventHandler<TEvent extends Event = Event> = (event: TEvent) => void | Promise<void>;

/**
 * Component lifecycle hook types
 */
export interface ComponentLifecycleHooks<TProps = BaseComponentProps, TState = BaseComponentState> {
    onBeforeMount?(): void | Promise<void>;
    onMount?(): void | Promise<void>;
    onBeforeUpdate?(newProps: TProps, newState: TState): void | Promise<void>;
    onUpdate?(oldProps: TProps, oldState: TState): void | Promise<void>;
    onBeforeUnmount?(): void | Promise<void>;
    onUnmount?(): void | Promise<void>;
    onError?(error: Error, errorInfo: { componentStack: string }): void | Promise<void>;
}

/**
 * Enhanced BaseComponent with modern TypeScript features including generics,
 * conditional types, utility types, and type-safe event handling
 */
export abstract class BaseComponent<
    TProps extends ComponentProps = ComponentProps,
    TState extends ComponentState = ComponentState,
    TEventMap extends ComponentEventMap = ComponentEventMap
> extends HTMLElement {
    /** @type {ShadowRoot} The shadow root attached to this component. */
    protected shadow: ShadowRoot;

    /** Component props with type safety */
    protected props: TProps;

    /** Component state with type safety */
    protected state: TState;

    /** Component metadata */
    protected metadata?: ComponentMetadata;

    /** Lifecycle hooks */
    protected lifecycleHooks?: ComponentLifecycleHooks<TProps, TState>;

    /** Event listeners map for cleanup */
    private eventListeners: Map<string, Set<EventHandler>> = new Map();

    /** Render flags for performance optimization */
    private _needsRender: boolean = false;
    private _renderPending: boolean = false;

    constructor(props?: TProps, metadata?: ComponentMetadata) {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.props = (props || {}) as TProps;
        this.state = {} as TState;
        this.metadata = metadata;
    }


    /**
     * Sets up event listeners for the component.
     * Must be implemented by subclasses.
     */
    protected abstract setupEventListeners(): void;

    /**
     * Called when the element is inserted into the DOM.
     * Initializes the component and starts the render lifecycle.
     */
    connectedCallback(): void {
        this.initializeComponent();
        this.callLifecycleHook('onBeforeMount');
        this._needsRender = true;
        this.requestRender();
        this.setupEventListeners();
        this.callLifecycleHook('onMount');
    }

    /**
     * Called when the element is removed from the DOM.
     * Performs cleanup and calls lifecycle hooks.
     */
    disconnectedCallback(): void {
        this.callLifecycleHook('onBeforeUnmount');
        this.cleanup();
        this.callLifecycleHook('onUnmount');
    }

    /**
     * Initialize component with type-safe props and state
     */
    protected initializeComponent(): void {
        this.initializeProps();
        this.initializeState();
    }

    /**
     * Initialize component props with type safety
     */
    protected initializeProps(): void {
        // Allow subclasses to override for custom prop initialization
        const defaultProps = this.getDefaultProps();
        this.props = { ...defaultProps, ...this.props } as TProps;
    }

    /**
     * Initialize component state with type safety
     */
    protected initializeState(): void {
        // Allow subclasses to override for custom state initialization
        const defaultState = this.getDefaultState();
        this.state = { ...defaultState, ...this.state } as TState;
    }

    /**
     * Get default props for the component
     */
    protected getDefaultProps(): Partial<TProps> {
        return {} as Partial<TProps>;
    }

    /**
     * Get default state for the component
     */
    protected getDefaultState(): Partial<TState> {
        return {} as Partial<TState>;
    }

    /**
     * Update component props with type safety
     */
    protected updateProps(newProps: Partial<TProps>): void {
        const oldProps = { ...this.props };
        this.props = { ...this.props, ...newProps } as TProps;
        this.onPropsUpdated(oldProps, this.props);
    }

    /**
     * Update component state with type safety
     */
    protected setState(newState: Partial<TState>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState } as TState;
        this.onStateUpdated(oldState, this.state);
    }

    /**
     * Called when props are updated
     */
    protected onPropsUpdated(oldProps: TProps, newProps: TProps): void {
        this.callLifecycleHook('onBeforeUpdate', newProps, this.state);
        this.markForRender();
        this.callLifecycleHook('onUpdate', oldProps, this.state);
    }

    /**
     * Called when state is updated
     */
    protected onStateUpdated(oldState: TState, newState: TState): void {
        this.markForRender();
    }

    /**
     * Cleanup method for component resources
     */
    protected cleanup(): void {
        this.removeAllEventListeners();
        // Allow subclasses to override for additional cleanup
    }

    /**
     * Call lifecycle hook with error handling
     */
    private async callLifecycleHook<K extends keyof ComponentLifecycleHooks<TProps, TState>>(
        hookName: K,
        ...args: Parameters<NonNullable<ComponentLifecycleHooks<TProps, TState>[K]>>
    ): Promise<void> {
        try {
            const hook = this.lifecycleHooks?.[hookName];
            if (hook) {
                const result = hook.apply(this, args);
                if (result instanceof Promise) {
                    await result;
                }
            }
        } catch (error) {
            await this.handleLifecycleError(error as Error, hookName);
        }
    }

    /**
     * Handle lifecycle hook errors
     */
    private async handleLifecycleError(error: Error, hookName: keyof ComponentLifecycleHooks<TProps, TState>): Promise<void> {
        const errorInfo = { componentStack: `${this.constructor.name}.${String(hookName)}` };
        try {
            this.lifecycleHooks?.onError?.(error, errorInfo);
        } catch (hookError) {
            // If error hook itself fails, fall back to basic error handling
            console.error('Error in error handler:', hookError);
        }
        this.handleError(error, `lifecycle hook: ${String(hookName)}`);
    }

    /**
     * Type-safe event handling system for shadow DOM
     */
    protected addTypedEventListener<K extends keyof TEventMap>(
        type: K,
        listener: EventHandler<TEventMap[K]>,
        options?: AddEventListenerOptions
    ): void {
        const eventType = String(type);
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }

        this.eventListeners.get(eventType)!.add(listener);
        this.shadow.addEventListener(eventType, listener as EventListener, options);
    }

    /**
     * Remove specific typed event listener for cleanup
     */
    protected removeTypedEventListener<K extends keyof TEventMap>(
        type: K,
        listener: EventHandler<TEventMap[K]>
    ): void {
        const eventType = String(type);
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(listener);
            this.shadow.removeEventListener(eventType, listener as EventListener);
        }
    }

    /**
     * Remove all event listeners for cleanup
     */
    protected removeAllEventListeners(): void {
        this.eventListeners.forEach((listeners, eventType) => {
            listeners.forEach(listener => {
                this.shadow.removeEventListener(eventType, listener as EventListener);
            });
            listeners.clear();
        });
        this.eventListeners.clear();
    }

    /**
     * Dispatch custom event with type safety
     */
    protected dispatchCustomEvent<K extends keyof TEventMap>(
        type: K,
        detail?: any,
        options?: CustomEventInit
    ): boolean {
        const event = new CustomEvent(String(type), {
            bubbles: true,
            composed: true,
            detail,
            ...options
        });
        return this.dispatchEvent(event);
    }

    /**
     * Simple dispatch method for toast events (backward compatible)
     */
    protected dispatchToastEvent(message: string, type: 'error' | 'success' = 'error', duration?: number): void {
        this.dispatchCustomEvent('show-toast' as keyof TEventMap, {
            message,
            type,
            duration
        });
    }

    /**
     * Schedules a render operation using requestAnimationFrame for optimal performance.
     */
    protected requestRender() {
        if (this._renderPending) return;
        this._renderPending = true;
        requestAnimationFrame(() => {
            if (this._needsRender) {
                this._needsRender = false;
                this.render();
            }
            this._renderPending = false;
        });
    }

    /**
     * Marks the component as needing a re-render.
     */
    protected markForRender() {
        this._needsRender = true;
        this.requestRender();
    }

    /**
     * Enhanced error handling with type safety and lifecycle integration
     * @param error - The error that occurred
     * @param context - Description of where the error occurred
     */
    protected handleError(error: Error, context: string): void {
        console.error(`Error in ${this.constructor.name} (${context}):`, error);

        // Update state to reflect error
        this.setState({
            hasError: true,
            errorMessage: error.message
        } as Partial<TState>);

        // Call error lifecycle hook if available
        const errorInfo = { componentStack: `${this.constructor.name}.${context}` };
        this.lifecycleHooks?.onError?.(error, errorInfo);

        this.showErrorToast(`An error occurred in ${context}. Please try again.`);
    }

    /**
     * Enhanced error toast with type safety
     * @param message - The error message to display
     * @param duration - Optional duration for the toast
     */
    protected showErrorToast(message: string, duration?: number): void {
        this.dispatchToastEvent(message, 'error', duration);
    }

    /**
     * Enhanced success toast with type safety
     * @param message - The success message to display
     * @param duration - Optional duration for the toast
     */
    protected showSuccessToast(message: string, duration?: number): void {
        this.dispatchToastEvent(message, 'success', duration);
    }

    /**
     * Enhanced utility method for querying a single element within the shadow DOM with type safety
     * @param selector - CSS selector for the element
     * @returns The matched element or null if not found
     */
    protected $<T extends Element = Element>(selector: string): T | null {
        return this.shadow.querySelector<T>(selector);
    }

    /**
     * Enhanced utility method for querying multiple elements within the shadow DOM with type safety
     * @param selector - CSS selector for the elements
     * @returns A NodeList of matched elements
     */
    protected $$<T extends Element = Element>(selector: string): NodeListOf<T> {
        return this.shadow.querySelectorAll<T>(selector);
    }

    /**
     * Type-safe method to get component metadata
     */
    protected getComponentMetadata(): ComponentMetadata | undefined {
        return this.metadata;
    }

    /**
     * Type-safe method to update component metadata
     */
    protected updateMetadata(updates: Partial<ComponentMetadata>): void {
        if (this.metadata) {
            this.metadata = { ...this.metadata, ...updates };
        }
    }

    /**
     * Type-safe props getter
     */
    protected getProps(): TProps {
        return this.props;
    }

    /**
     * Type-safe state getter
     */
    protected getState(): TState {
        return this.state;
    }

    /**
     * Enhanced render method with error boundary
     */
    protected render(): void {
        try {
            this.performRender();
        } catch (error) {
            this.handleError(error as Error, 'render');
        }
    }

    /**
     * Abstract method for actual rendering implementation
     * Subclasses should implement this instead of render() for error handling
     */
    protected abstract performRender(): void;
}