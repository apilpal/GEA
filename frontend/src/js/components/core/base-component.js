export class BaseComponent extends HTMLElement {
    constructor(props, metadata) {
        super();
        this.eventListeners = new Map();
        this._needsRender = false;
        this._renderPending = false;
        this.shadow = this.attachShadow({ mode: 'open' });
        this.props = (props || {});
        this.state = {};
        this.metadata = metadata;
    }
    connectedCallback() {
        this.initializeComponent();
        this.callLifecycleHook('onBeforeMount');
        this._needsRender = true;
        this.requestRender();
        this.setupEventListeners();
        this.callLifecycleHook('onMount');
    }
    disconnectedCallback() {
        this.callLifecycleHook('onBeforeUnmount');
        this.cleanup();
        this.callLifecycleHook('onUnmount');
    }
    initializeComponent() {
        this.initializeProps();
        this.initializeState();
    }
    initializeProps() {
        const defaultProps = this.getDefaultProps();
        this.props = { ...defaultProps, ...this.props };
    }
    initializeState() {
        const defaultState = this.getDefaultState();
        this.state = { ...defaultState, ...this.state };
    }
    getDefaultProps() {
        return {};
    }
    getDefaultState() {
        return {};
    }
    updateProps(newProps) {
        const oldProps = { ...this.props };
        this.props = { ...this.props, ...newProps };
        this.onPropsUpdated(oldProps, this.props);
    }
    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.onStateUpdated(oldState, this.state);
    }
    onPropsUpdated(oldProps, newProps) {
        this.callLifecycleHook('onBeforeUpdate', newProps, this.state);
        this.markForRender();
        this.callLifecycleHook('onUpdate', oldProps, this.state);
    }
    onStateUpdated(oldState, newState) {
        this.markForRender();
    }
    cleanup() {
        this.removeAllEventListeners();
    }
    async callLifecycleHook(hookName, ...args) {
        try {
            const hook = this.lifecycleHooks?.[hookName];
            if (hook) {
                const result = hook.apply(this, args);
                if (result instanceof Promise) {
                    await result;
                }
            }
        }
        catch (error) {
            await this.handleLifecycleError(error, hookName);
        }
    }
    async handleLifecycleError(error, hookName) {
        const errorInfo = { componentStack: `${this.constructor.name}.${String(hookName)}` };
        try {
            this.lifecycleHooks?.onError?.(error, errorInfo);
        }
        catch (hookError) {
            console.error('Error in error handler:', hookError);
        }
        this.handleError(error, `lifecycle hook: ${String(hookName)}`);
    }
    addTypedEventListener(type, listener, options) {
        const eventType = String(type);
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(listener);
        this.shadow.addEventListener(eventType, listener, options);
    }
    removeTypedEventListener(type, listener) {
        const eventType = String(type);
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.delete(listener);
            this.shadow.removeEventListener(eventType, listener);
        }
    }
    removeAllEventListeners() {
        this.eventListeners.forEach((listeners, eventType) => {
            listeners.forEach(listener => {
                this.shadow.removeEventListener(eventType, listener);
            });
            listeners.clear();
        });
        this.eventListeners.clear();
    }
    dispatchCustomEvent(type, detail, options) {
        const event = new CustomEvent(String(type), {
            bubbles: true,
            composed: true,
            detail,
            ...options
        });
        return this.dispatchEvent(event);
    }
    dispatchToastEvent(message, type = 'error', duration) {
        this.dispatchCustomEvent('show-toast', {
            message,
            type,
            duration
        });
    }
    requestRender() {
        if (this._renderPending)
            return;
        this._renderPending = true;
        requestAnimationFrame(() => {
            if (this._needsRender) {
                this._needsRender = false;
                this.render();
            }
            this._renderPending = false;
        });
    }
    markForRender() {
        this._needsRender = true;
        this.requestRender();
    }
    handleError(error, context) {
        console.error(`Error in ${this.constructor.name} (${context}):`, error);
        this.setState({
            hasError: true,
            errorMessage: error.message
        });
        const errorInfo = { componentStack: `${this.constructor.name}.${context}` };
        this.lifecycleHooks?.onError?.(error, errorInfo);
        this.showErrorToast(`An error occurred in ${context}. Please try again.`);
    }
    showErrorToast(message, duration) {
        this.dispatchToastEvent(message, 'error', duration);
    }
    showSuccessToast(message, duration) {
        this.dispatchToastEvent(message, 'success', duration);
    }
    $(selector) {
        return this.shadow.querySelector(selector);
    }
    $$(selector) {
        return this.shadow.querySelectorAll(selector);
    }
    getComponentMetadata() {
        return this.metadata;
    }
    updateMetadata(updates) {
        if (this.metadata) {
            this.metadata = { ...this.metadata, ...updates };
        }
    }
    getProps() {
        return this.props;
    }
    getState() {
        return this.state;
    }
    render() {
        try {
            this.performRender();
        }
        catch (error) {
            this.handleError(error, 'render');
        }
    }
}
//# sourceMappingURL=base-component.js.map