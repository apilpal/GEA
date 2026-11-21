# BaseComponent API Documentation

## Overview

The Enhanced BaseComponent system provides a modern, type-safe foundation for building web components with advanced TypeScript features, lifecycle management, and performance optimizations.

## Core Concepts

### BaseComponent Class

The abstract base class that all components extend.

```typescript
import { BaseComponent } from './components/core/base-component';

export abstract class MyComponent extends BaseComponent<MyProps, MyState> {
    protected performRender(): void {
        // Component rendering logic
    }
}
```

### Props and State

Type-safe component properties and state management.

```typescript
import { BaseComponentProps, BaseComponentState } from './components/core/base-component';

interface MyComponentProps extends BaseComponentProps {
    title: string;
    count: number;
    disabled?: boolean;
}

interface MyComponentState extends BaseComponentState {
    isLoading: boolean;
    error?: string;
    data?: any[];
}
```

### Event System

Type-safe custom event handling.

```typescript
interface MyComponentEventMap {
    'item-selected': CustomEvent<Item>;
    'data-loaded': CustomEvent<Data[]>;
    'error-occurred': CustomEvent<Error>;
}
```

## API Reference

### BaseComponent Class

#### Constructor

```typescript
constructor(props?: TProps, metadata?: ComponentMetadata)
```

**Parameters:**
- `props`: Initial component properties (optional)
- `metadata`: Component metadata (optional)

#### Abstract Methods

##### performRender()

The main rendering method that subclasses must implement.

```typescript
protected abstract performRender(): void
```

##### setupEventListeners()

Sets up component event listeners.

```typescript
protected abstract setupEventListeners(): void
```

#### Lifecycle Methods

##### Component Lifecycle Hooks

```typescript
interface ComponentLifecycleHooks<TProps, TState> {
    onBeforeMount?(): void | Promise<void>;
    onMount?(): void | Promise<void>;
    onBeforeUpdate?(newProps: TProps, newState: TState): void | Promise<void>;
    onUpdate?(oldProps: TProps, oldState: TState): void | Promise<void>;
    onBeforeUnmount?(): void | Promise<void>;
    onUnmount?(): void | Promise<void>;
    onError?(error: Error, errorInfo: { componentStack: string }): void | Promise<void>;
}
```

#### Property and State Management

##### setState(newState)

Updates component state with partial state objects.

```typescript
protected setState(newState: Partial<TState>): void
```

**Example:**
```typescript
this.setState({
    isLoading: false,
    data: result,
    error: undefined
});
```

##### updateProps(newProps)

Updates component props and triggers lifecycle hooks.

```typescript
protected updateProps(newProps: Partial<TProps>): void
```

##### getProps() / getState()

Type-safe getters for props and state.

```typescript
protected getProps(): TProps
protected getState(): TState
```

#### Event Handling

##### addTypedEventListener(type, listener, options?)

Adds a type-safe event listener to the shadow DOM.

```typescript
protected addTypedEventListener<K extends keyof TEventMap>(
    type: K,
    listener: EventHandler<TEventMap[K]>,
    options?: AddEventListenerOptions
): void
```

**Example:**
```typescript
this.addTypedEventListener('item-selected', (event) => {
    console.log('Selected item:', event.detail);
});
```

##### removeTypedEventListener(type, listener)

Removes a specific typed event listener.

```typescript
protected removeTypedEventListener<K extends keyof TEventMap>(
    type: K,
    listener: EventHandler<TEventMap[K]>
): void
```

##### dispatchCustomEvent(type, detail?, options?)

Dispatches a custom event with type safety.

```typescript
protected dispatchCustomEvent<K extends keyof TEventMap>(
    type: K,
    detail?: any,
    options?: CustomEventInit
): boolean
```

**Example:**
```typescript
this.dispatchCustomEvent('data-loaded', data, {
    bubbles: true,
    composed: true
});
```

#### DOM Utilities

##### $(selector)

Type-safe shadow DOM element selection.

```typescript
protected $<T extends Element = Element>(selector: string): T | null
```

**Example:**
```typescript
const button = this.$<HTMLButtonElement>('.submit-btn');
if (button) {
    button.disabled = this.props.disabled || false;
}
```

##### $$(selector)

Type-safe shadow DOM element collection.

```typescript
protected $$<T extends Element = Element>(selector: string): NodeListOf<T>
```

**Example:**
```typescript
const items = this.$$<HTMLDivElement>('.list-item');
items.forEach(item => {
    item.classList.add('loaded');
});
```

#### Error Handling

##### handleError(error, context)

Enhanced error handling with state updates and lifecycle integration.

```typescript
protected handleError(error: Error, context: string): void
```

**Example:**
```typescript
try {
    await this.loadData();
} catch (error) {
    this.handleError(error, 'data loading');
}
```

##### showErrorToast(message, duration?)

Displays an error toast notification.

```typescript
protected showErrorToast(message: string, duration?: number): void
```

##### showSuccessToast(message, duration?)

Displays a success toast notification.

```typescript
protected showSuccessToast(message: string, duration?: number): void
```

#### Performance Optimization

##### markForRender()

Marks the component for re-rendering.

```typescript
protected markForRender(): void
```

##### requestRender()

Schedules a render operation using requestAnimationFrame.

```typescript
protected requestRender(): void
```

## Type Definitions

### Utility Types

#### ComponentProps<T>

Conditional type for component props ensuring BaseComponentProps extension.

```typescript
export type ComponentProps<T = BaseComponentProps> = T extends BaseComponentProps
    ? T
    : BaseComponentProps & T;
```

#### ComponentState<T>

Conditional type for component state ensuring BaseComponentState extension.

```typescript
export type ComponentState<T = BaseComponentState> = T extends BaseComponentState
    ? T
    : BaseComponentState & T;
```

#### EventHandler<TEvent>

Type-safe event handler type.

```typescript
export type EventHandler<TEvent extends Event = Event> = (event: TEvent) => void | Promise<void>;
```

#### ComponentEventMap

Event map type for type-safe event handling.

```typescript
export type ComponentEventMap = Record<string, Event>;
```

## Advanced Features

### Generic Constraints

#### Component Name Types

Template literal types for component naming.

```typescript
export type ComponentName<T extends string = string> = T extends `${string}-${string}`
    ? T
    : never;
```

**Example:**
```typescript
// Valid component names
type ValidName = ComponentName<'my-component'>; // ✅ Valid
type InvalidName = ComponentName<'mycomponent'>; // ❌ Invalid

// Usage in component definition
interface MyComponent extends BaseComponent {
    tagName: ComponentName; // Must be kebab-case
}
```

### Metadata System

#### ComponentMetadata Interface

```typescript
export interface ComponentMetadata {
    readonly tagName: string;
    readonly version: string;
    readonly description?: string;
}
```

**Example:**
```typescript
const metadata: ComponentMetadata = {
    tagName: 'my-component',
    version: '1.0.0',
    description: 'A custom component for displaying data'
};

class MyComponent extends BaseComponent {
    constructor() {
        super({}, metadata);
    }
}
```

### Lifecycle Integration

#### Error Boundary Pattern

```typescript
class ErrorBoundaryComponent extends BaseComponent {
    protected performRender(): void {
        if (this.state.hasError) {
            this.renderErrorState();
        } else {
            this.renderNormalState();
        }
    }

    protected onError(error: Error, errorInfo: { componentStack: string }): void {
        this.setState({
            hasError: true,
            errorMessage: error.message
        });
    }
}
```

## Best Practices

### TypeScript Usage

```typescript
// Define clear interfaces for props and state
interface TodoItemProps extends BaseComponentProps {
    id: string;
    title: string;
    completed: boolean;
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

interface TodoItemState extends BaseComponentState {
    isEditing: boolean;
    editText: string;
}

// Use generics for maximum type safety
class TodoItemComponent extends BaseComponent<TodoItemProps, TodoItemState> {
    // Component implementation
}
```

### Event Handling

```typescript
// Define clear event map
interface TodoItemEventMap {
    'toggle': CustomEvent<{ id: string; completed: boolean }>;
    'delete': CustomEvent<{ id: string }>;
    'edit': CustomEvent<{ id: string; text: string }>;
}

// Use typed events throughout
class TodoItemComponent extends BaseComponent<TodoItemProps, TodoItemState, TodoItemEventMap> {
    private handleToggle = () => {
        this.dispatchCustomEvent('toggle', {
            id: this.props.id,
            completed: !this.props.completed
        });
    };

    private handleDelete = () => {
        this.dispatchCustomEvent('delete', {
            id: this.props.id
        });
    };
}
```

### Performance Optimization

```typescript
class OptimizedComponent extends BaseComponent {
    // Use requestAnimationFrame for smooth updates
    protected updateView() {
        this.markForRender();
        // Component will re-render on next animation frame
    }

    // Batch multiple state updates
    protected batchUpdate() {
        // Multiple state changes will trigger only one render
        this.setState({ loading: true });
        this.setState({ progress: 0 });
        this.setState({ status: 'processing' });
    }
}
```

### Error Handling

```typescript
class RobustComponent extends BaseComponent {
    protected async performAsyncOperation() {
        try {
            this.setState({ isLoading: true, error: undefined });

            const result = await this.apiCall();

            this.setState({
                isLoading: false,
                data: result
            });

            this.showSuccessToast('Operation completed successfully');

        } catch (error) {
            this.handleError(error as Error, 'async operation');
        }
    }

    protected onError(error: Error, errorInfo: { componentStack: string }): void {
        // Custom error handling logic
        if (error.message.includes('network')) {
            this.showErrorToast('Network error. Please check your connection.');
        } else {
            this.showErrorToast('An unexpected error occurred.');
        }
    }
}
```

## Examples

### Basic Component

```typescript
interface GreetingProps extends BaseComponentProps {
    name: string;
    greeting?: string;
}

interface GreetingState extends BaseComponentState {
    currentTime: string;
}

class GreetingComponent extends BaseComponent<GreetingProps, GreetingState> {
    private updateTimer?: number;

    constructor() {
        super();
        this.state = {
            currentTime: new Date().toLocaleTimeString()
        };
    }

    protected setupEventListeners(): void {
        // Set up any event listeners
    }

    protected getDefaultProps(): Partial<GreetingProps> {
        return {
            greeting: 'Hello'
        };
    }

    protected initializeState(): void {
        // Start time update timer
        this.updateTimer = window.setInterval(() => {
            this.setState({
                currentTime: new Date().toLocaleTimeString()
            });
        }, 1000);
    }

    protected cleanup(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
    }

    protected performRender(): void {
        const greeting = this.props.greeting || 'Hello';
        const name = this.props.name;

        this.shadow.innerHTML = `
            <div class="greeting">
                <h1>${greeting}, ${name}!</h1>
                <p>Current time: ${this.state.currentTime}</p>
            </div>
        `;
    }
}
```

### Component with Custom Events

```typescript
interface CounterEventMap {
    'count-changed': CustomEvent<{ value: number }>;
    'maximum-reached': CustomEvent<{ value: number }>;
}

interface CounterProps extends BaseComponentProps {
    initialValue?: number;
    max?: number;
    step?: number;
}

class CounterComponent extends BaseComponent<CounterProps, { value: number }, CounterEventMap> {
    protected getDefaultProps(): Partial<CounterProps> {
        return {
            initialValue: 0,
            max: 100,
            step: 1
        };
    }

    protected initializeState(): void {
        this.state = {
            value: this.props.initialValue || 0
        };
    }

    protected setupEventListeners(): void {
        const incrementBtn = this.$<HTMLButtonElement>('.increment');
        const decrementBtn = this.$<HTMLButtonElement>('.decrement');

        if (incrementBtn) {
            this.addTypedEventListener('click', this.handleIncrement, {
                target: incrementBtn
            });
        }

        if (decrementBtn) {
            this.addTypedEventListener('click', this.handleDecrement, {
                target: decrementBtn
            });
        }
    }

    private handleIncrement = () => {
        const newValue = this.state.value + (this.props.step || 1);
        this.setState({ value: newValue });

        this.dispatchCustomEvent('count-changed', { value: newValue });

        if (newValue >= (this.props.max || 100)) {
            this.dispatchCustomEvent('maximum-reached', { value: newValue });
        }
    };

    private handleDecrement = () => {
        const newValue = this.state.value - (this.props.step || 1);
        this.setState({ value: newValue });

        this.dispatchCustomEvent('count-changed', { value: newValue });
    };

    protected performRender(): void {
        this.shadow.innerHTML = `
            <div class="counter">
                <button class="decrement">-</button>
                <span class="value">${this.state.value}</span>
                <button class="increment">+</button>
            </div>
        `;
    }
}
```

## Migration Guide

### From Basic HTMLElement

```typescript
// Before
class OldComponent extends HTMLElement {
    connectedCallback() {
        this.innerHTML = '<div>Hello World</div>';
    }
}

// After
interface OldComponentProps extends BaseComponentProps {}
interface OldComponentState extends BaseComponentState {}

class OldComponent extends BaseComponent<OldComponentProps, OldComponentState> {
    protected performRender(): void {
        this.shadow.innerHTML = '<div>Hello World</div>';
    }

    protected setupEventListeners(): void {
        // Set up event listeners
    }
}
```

### From React-like Components

```typescript
// Before (React-like)
class OldComponent {
    constructor(props) {
        this.props = props;
        this.state = {};
    }

    render() {
        return '<div>Hello</div>';
    }
}

// After (BaseComponent)
interface OldComponentProps extends BaseComponentProps {
    name: string;
}

class OldComponent extends BaseComponent<OldComponentProps, { greeting: string }> {
    protected performRender(): void {
        this.shadow.innerHTML = `<div>Hello ${this.props.name}</div>`;
    }

    protected setupEventListeners(): void {
        // Set up event listeners
    }
}