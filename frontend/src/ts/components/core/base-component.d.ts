export interface ComponentMetadata {
    readonly tagName: string;
    readonly version: string;
    readonly description?: string;
}
export interface BaseComponentProps {
    id?: string;
    className?: string;
    disabled?: boolean;
    hidden?: boolean;
}
export interface BaseComponentState {
    isLoading?: boolean;
    hasError?: boolean;
    errorMessage?: string;
}
export type ComponentName<T extends string = string> = T extends `${string}-${string}` ? T : never;
export type ComponentProps<T = BaseComponentProps> = T extends BaseComponentProps ? T : BaseComponentProps & T;
export type ComponentState<T = BaseComponentState> = T extends BaseComponentState ? T : BaseComponentState & T;
export type ComponentEventMap = Record<string, Event>;
export type OptionalProps<T> = {
    [K in keyof T]?: T[K];
};
export type EventHandler<TEvent extends Event = Event> = (event: TEvent) => void | Promise<void>;
export interface ComponentLifecycleHooks<TProps = BaseComponentProps, TState = BaseComponentState> {
    onBeforeMount?(): void | Promise<void>;
    onMount?(): void | Promise<void>;
    onBeforeUpdate?(newProps: TProps, newState: TState): void | Promise<void>;
    onUpdate?(oldProps: TProps, oldState: TState): void | Promise<void>;
    onBeforeUnmount?(): void | Promise<void>;
    onUnmount?(): void | Promise<void>;
    onError?(error: Error, errorInfo: {
        componentStack: string;
    }): void | Promise<void>;
}
export declare abstract class BaseComponent<TProps extends ComponentProps = ComponentProps, TState extends ComponentState = ComponentState, TEventMap extends ComponentEventMap = ComponentEventMap> extends HTMLElement {
    protected shadow: ShadowRoot;
    protected props: TProps;
    protected state: TState;
    protected metadata?: ComponentMetadata;
    protected lifecycleHooks?: ComponentLifecycleHooks<TProps, TState>;
    private eventListeners;
    private _needsRender;
    private _renderPending;
    constructor(props?: TProps, metadata?: ComponentMetadata);
    protected abstract setupEventListeners(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected initializeComponent(): void;
    protected initializeProps(): void;
    protected initializeState(): void;
    protected getDefaultProps(): Partial<TProps>;
    protected getDefaultState(): Partial<TState>;
    protected updateProps(newProps: Partial<TProps>): void;
    protected setState(newState: Partial<TState>): void;
    protected onPropsUpdated(oldProps: TProps, newProps: TProps): void;
    protected onStateUpdated(oldState: TState, newState: TState): void;
    protected cleanup(): void;
    private callLifecycleHook;
    private handleLifecycleError;
    protected addTypedEventListener<K extends keyof TEventMap>(type: K, listener: EventHandler<TEventMap[K]>, options?: AddEventListenerOptions): void;
    protected removeTypedEventListener<K extends keyof TEventMap>(type: K, listener: EventHandler<TEventMap[K]>): void;
    protected removeAllEventListeners(): void;
    protected dispatchCustomEvent<K extends keyof TEventMap>(type: K, detail?: any, options?: CustomEventInit): boolean;
    protected dispatchToastEvent(message: string, type?: 'error' | 'success', duration?: number): void;
    protected requestRender(): void;
    protected markForRender(): void;
    protected handleError(error: Error, context: string): void;
    protected showErrorToast(message: string, duration?: number): void;
    protected showSuccessToast(message: string, duration?: number): void;
    protected $<T extends Element = Element>(selector: string): T | null;
    protected $$<T extends Element = Element>(selector: string): NodeListOf<T>;
    protected getComponentMetadata(): ComponentMetadata | undefined;
    protected updateMetadata(updates: Partial<ComponentMetadata>): void;
    protected getProps(): TProps;
    protected getState(): TState;
    protected render(): void;
    protected abstract performRender(): void;
}
//# sourceMappingURL=base-component.d.ts.map