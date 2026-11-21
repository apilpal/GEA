import { BaseComponent, BaseComponentProps, BaseComponentState } from '@/ts/components/core/base-component';
export interface ThemeToggleProps extends BaseComponentProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'text' | 'minimal';
    showLabel?: boolean;
    ariaLabel?: string;
}
export interface ThemeToggleState extends BaseComponentState {
    currentTheme: 'light' | 'dark';
    isTransitioning: boolean;
    initialized: boolean;
}
export declare class ThemeToggleComponent extends BaseComponent<ThemeToggleProps, ThemeToggleState> {
    private storeProvider;
    private unsubscribeStore;
    private animationFrame;
    constructor(props?: ThemeToggleProps);
    protected getDefaultProps(): Partial<ThemeToggleProps>;
    protected getDefaultState(): Partial<ThemeToggleState>;
    protected setupEventListeners(): void;
    private subscribeToStore;
    private handleToggle;
    private handleKeyDown;
    private updateAriaAttributes;
    private updateAnimationState;
    protected performRender(): void;
    private renderIcon;
    private renderLabel;
    private injectStyles;
    protected cleanup(): void;
    static get observedAttributes(): string[];
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
}
//# sourceMappingURL=theme-toggle-component.d.ts.map