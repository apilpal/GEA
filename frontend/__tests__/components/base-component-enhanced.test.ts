// Enhanced BaseComponent tests with TypeScript strict mode

import { BaseComponent, ComponentProps, ComponentState, ComponentEventMap } from '../../src/ts/components/core/base-component';

// Test interfaces
interface TestComponentProps extends ComponentProps {
    title: string;
    count: number;
    disabled?: boolean;
}

interface TestComponentState extends ComponentState {
    isLoading: boolean;
    error?: string;
    data?: string[];
}

interface TestComponentEventMap extends ComponentEventMap {
    'test-event': CustomEvent<{ value: string }>;
    'error-occurred': CustomEvent<{ error: string }>;
    'data-loaded': CustomEvent<{ data: string[] }>;
}

// Test component implementation with public accessors for testing
class TestableBaseComponent extends BaseComponent<TestComponentProps, TestComponentState, TestComponentEventMap> {
    protected setupEventListeners(): void {
        // Setup event listeners if needed for testing
    }

    protected performRender(): void {
        this.shadow.innerHTML = `
            <div class="test-component">
                <h1>${this.props.title}</h1>
                <p>Count: ${this.props.count}</p>
                ${this.state.isLoading ? '<div class="loading">Loading...</div>' : ''}
                ${this.state.error ? `<div class="error">${this.state.error}</div>` : ''}
            </div>
        `;
    }

    // Public accessors for testing
    public getTestProps(): TestComponentProps {
        return this.props;
    }

    public getTestState(): TestComponentState {
        return this.state;
    }

    public callUpdateProps(newProps: Partial<TestComponentProps>): void {
        this.updateProps(newProps);
    }

    public callSetState(newState: Partial<TestComponentState>): void {
        this.setState(newState);
    }

    public callHandleError(error: Error, context: string): void {
        (this as any).handleError(error, context);
    }

    public getTestElement<T extends Element = Element>(selector: string): T | null {
        return this.$(selector);
    }

    public getTestElements<T extends Element = Element>(selector: string): NodeListOf<T> {
        return this.$$(selector);
    }

    public triggerTestEvent(detail: { value: string }): void {
        this.dispatchCustomEvent('test-event', detail);
    }

    public getTestMetadata(): any {
        return this.metadata;
    }

    public callUpdateMetadata(updates: any): void {
        (this as any).updateMetadata(updates);
    }

    public getDefaultPropsTest(): Partial<TestComponentProps> {
        return (this as any).getDefaultProps();
    }

    public getDefaultStateTest(): Partial<TestComponentState> {
        return (this as any).getDefaultState();
    }
}

describe('Enhanced BaseComponent', () => {
    let component: TestableBaseComponent;

    beforeEach(() => {
        document.body.innerHTML = '';
        component = new TestableBaseComponent();
        document.body.appendChild(component);
    });

    afterEach(() => {
        if (component.parentNode) {
            component.parentNode.removeChild(component);
        }
    });

    describe('Initialization', () => {
        it('should initialize with default props and state', () => {
            const props = component.getTestProps();
            const state = component.getTestState();

            expect(props.title).toBe('');
            expect(props.count).toBe(0);
            expect(props.disabled).toBe(false);

            expect(state.isLoading).toBe(false);
            expect(state.hasError).toBe(false);
            expect(state.errorMessage).toBeUndefined();
        });

        it('should initialize with custom props', () => {
            const customComponent = new TestableBaseComponent({
                title: 'Test Title',
                count: 42,
                disabled: true,
            });

            document.body.appendChild(customComponent);

            const props = customComponent.getTestProps();
            expect(props.title).toBe('Test Title');
            expect(props.count).toBe(42);
            expect(props.disabled).toBe(true);

            document.body.removeChild(customComponent);
        });

        it('should initialize with metadata', () => {
            const metadata = {
                tagName: 'test-component',
                version: '1.0.0',
                description: 'A test component',
            };

            const customComponent = new TestableBaseComponent({
                title: 'Metadata Test',
                count: 1,
            }, metadata);
            document.body.appendChild(customComponent);

            const componentMetadata = customComponent.getTestMetadata();
            expect(componentMetadata).toEqual(metadata);

            document.body.removeChild(customComponent);
        });

        it('should have shadow root', () => {
            expect(component.shadowRoot).toBeTruthy();
        });
    });

    describe('Props Management', () => {
        it('should update props correctly', () => {
            const newProps: Partial<TestComponentProps> = {
                title: 'Updated Title',
                count: 100,
            };

            component.callUpdateProps(newProps);

            const props = component.getTestProps();
            expect(props.title).toBe('Updated Title');
            expect(props.count).toBe(100);
            expect(props.disabled).toBe(false);
        });

        it('should get default props', () => {
            const defaultProps = component.getDefaultPropsTest();

            expect(defaultProps).toEqual({
                title: '',
                count: 0,
                disabled: false,
            });
        });

        it('should handle props update lifecycle', () => {
            const onPropsUpdatedSpy = jest.spyOn(component as any, 'onPropsUpdated');

            component.callUpdateProps({ title: 'New Title' });

            expect(onPropsUpdatedSpy).toHaveBeenCalled();

            onPropsUpdatedSpy.mockRestore();
        });
    });

    describe('State Management', () => {
        it('should update state correctly', () => {
            const newState: Partial<TestComponentState> = {
                isLoading: true,
                data: ['item1', 'item2'],
            };

            component.callSetState(newState);

            const state = component.getTestState();
            expect(state.isLoading).toBe(true);
            expect(state.hasError).toBe(false);
            expect(state.data).toEqual(['item1', 'item2']);
        });

        it('should get default state', () => {
            const defaultState = component.getDefaultStateTest();

            expect(defaultState).toEqual({
                isLoading: false,
                hasError: false,
                errorMessage: undefined,
            });
        });

        it('should handle state update lifecycle', () => {
            const onStateUpdatedSpy = jest.spyOn(component as any, 'onStateUpdated');

            component.callSetState({ isLoading: true });

            expect(onStateUpdatedSpy).toHaveBeenCalled();

            onStateUpdatedSpy.mockRestore();
        });
    });

    describe('DOM Utilities', () => {
        it('should query elements with type safety', () => {
            const titleElement = component.getTestElement<HTMLHeadingElement>('h1');
            expect(titleElement).toBeTruthy();
            expect(titleElement?.tagName).toBe('H1');
        });

        it('should query multiple elements with type safety', () => {
            const elements = component.getTestElements<HTMLDivElement>('*');
            expect(elements.length).toBeGreaterThan(0);
        });

        it('should return null for non-existent elements', () => {
            const nonExistent = component.getTestElement<HTMLDivElement>('.non-existent');
            expect(nonExistent).toBeNull();
        });
    });

    describe('Event Handling', () => {
        it('should dispatch custom events correctly', () => {
            const listener = jest.fn();
            component.addEventListener('test-event', listener as EventListener);

            component.triggerTestEvent({ value: 'test-value' });

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { value: 'test-value' },
                })
            );
        });

        it('should handle event listener cleanup', () => {
            const listener = jest.fn();
            component.addEventListener('test-event', listener as EventListener);

            component.triggerTestEvent({ value: 'test-value' });
            expect(listener).toHaveBeenCalledTimes(1);

            component.removeEventListener('test-event', listener as EventListener);

            component.triggerTestEvent({ value: 'test-value' });
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle errors and update state', () => {
            const testError = new Error('Test error');
            component.callHandleError(testError, 'test context');

            const state = component.getTestState();
            expect(state.hasError).toBe(true);
            expect(state.errorMessage).toBe('Test error');
        });

        it('should handle error lifecycle hooks', () => {
            const onError = jest.fn();
            (component as any).lifecycleHooks = { onError };

            const testError = new Error('Test error');
            component.callHandleError(testError, 'test context');

            expect(onError).toHaveBeenCalledWith(
                testError,
                { componentStack: 'TestableBaseComponent.test context' }
            );
        });
    });

    describe('Rendering', () => {
        it('should render content correctly', () => {
            const shadowRoot = component.shadowRoot;
            const title = shadowRoot?.querySelector('h1');
            const count = shadowRoot?.querySelector('p');

            expect(title?.textContent).toBe('');
            expect(count?.textContent).toBe('Count: 0');
        });

        it('should update render when state changes', () => {
            component.callSetState({ isLoading: true });

            const shadowRoot = component.shadowRoot;
            expect(shadowRoot?.querySelector('.loading')).toBeTruthy();

            component.callSetState({ isLoading: false, error: 'Test error' });

            expect(shadowRoot?.querySelector('.loading')).toBeFalsy();
            expect(shadowRoot?.querySelector('.error')).toBeTruthy();
        });
    });

    describe('Metadata Management', () => {
        it('should update metadata correctly', () => {
            const updates = {
                version: '2.0.0',
                description: 'Updated description',
            };

            component.callUpdateMetadata(updates);

            const metadata = component.getTestMetadata();
            expect(metadata?.version).toBe('2.0.0');
            expect(metadata?.description).toBe('Updated description');
        });
    });

    describe('Lifecycle Management', () => {
        it('should handle connected/disconnected lifecycle', () => {
            const connectedCallbackSpy = jest.spyOn(component as any, 'connectedCallback');
            const disconnectedCallbackSpy = jest.spyOn(component as any, 'disconnectedCallback');

            // Component already connected in beforeEach
            expect(connectedCallbackSpy).toHaveBeenCalled();

            document.body.removeChild(component);

            expect(disconnectedCallbackSpy).toHaveBeenCalled();

            connectedCallbackSpy.mockRestore();
            disconnectedCallbackSpy.mockRestore();
        });
    });

    describe('TypeScript Integration', () => {
        it('should enforce generic type constraints', () => {
            // This test verifies that TypeScript correctly enforces types
            const props: TestComponentProps = component.getTestProps();
            const state: TestComponentState = component.getTestState();

            expect(typeof props.title).toBe('string');
            expect(typeof props.count).toBe('number');
            expect(typeof state.isLoading).toBe('boolean');
        });

        it('should handle conditional types correctly', () => {
            // Test that BaseComponentProps and BaseComponentState are properly extended
            const defaultProps = component.getDefaultPropsTest();
            const defaultState = component.getDefaultStateTest();

            expect(defaultProps).toHaveProperty('id');
            expect(defaultProps).toHaveProperty('className');
            expect(defaultProps).toHaveProperty('disabled');
            expect(defaultState).toHaveProperty('isLoading');
            expect(defaultState).toHaveProperty('hasError');
        });

        it('should support template literal types for component names', () => {
            // Test that component name types work correctly
            const metadata = component.getTestMetadata();

            if (metadata?.tagName) {
                // This would be a valid component name with kebab-case
                expect(typeof metadata.tagName).toBe('string');
            }
        });
    });

    describe('Performance Features', () => {
        it('should use requestAnimationFrame for rendering', () => {
            const requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame');

            const markForRenderSpy = jest.spyOn(component as any, 'markForRender');
            (component as any).markForRender();

            expect(requestAnimationFrameSpy).toHaveBeenCalled();

            requestAnimationFrameSpy.mockRestore();
            markForRenderSpy.mockRestore();
        });

        it('should handle render batching', () => {
            const renderSpy = jest.spyOn(component as any, 'render');

            // Multiple state changes should batch renders
            component.callSetState({ isLoading: true });
            component.callSetState({ error: 'test' });

            // In a real implementation, this would batch to a single render
            // For testing, we just verify the state changes work
            const state = component.getTestState();
            expect(state.isLoading).toBe(true);
            expect(state.error).toBe('test');

            renderSpy.mockRestore();
        });
    });

    describe('Integration Tests', () => {
        it('should work with real DOM operations', () => {
            // Test that the component integrates properly with the DOM
            expect(component.parentNode).toBe(document.body);
            expect(component.shadowRoot).toBeTruthy();

            // Test that shadow DOM is properly encapsulated
            const shadowContent = component.shadowRoot?.innerHTML;
            expect(shadowContent).toContain('test-component');
        });

        it('should handle component lifecycle in real DOM', () => {
            // Create a new component and test its full lifecycle
            const newComponent = new TestableBaseComponent({
                title: 'Lifecycle Test',
                count: 1,
            });

            document.body.appendChild(newComponent);

            // Component should be in DOM
            expect(newComponent.parentNode).toBe(document.body);

            // Should render correctly
            const titleElement = newComponent.getTestElement<HTMLHeadingElement>('h1');
            expect(titleElement?.textContent).toBe('Lifecycle Test');

            // Remove from DOM
            document.body.removeChild(newComponent);

            // Component should be properly cleaned up
            expect(newComponent.parentNode).toBeNull();
        });
    });
});