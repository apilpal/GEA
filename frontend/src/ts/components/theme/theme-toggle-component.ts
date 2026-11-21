import { BaseComponent, BaseComponentProps, BaseComponentState, EventHandler } from '@/ts/components/core/base-component';
import { ThemeSelectors } from '@/ts/store/theme/selectors';
import { ThemeThunks } from '@/ts/store/theme/thunks';

/**
 * Theme toggle component props
 */
export interface ThemeToggleProps extends BaseComponentProps {
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'text' | 'minimal';
    showLabel?: boolean;
    ariaLabel?: string;
}

/**
 * Theme toggle component state
 */
export interface ThemeToggleState extends BaseComponentState {
    currentTheme: 'light' | 'dark';
    isTransitioning: boolean;
    initialized: boolean;
}

/**
 * Theme toggle component for switching between light and dark themes
 */
export class ThemeToggleComponent extends BaseComponent<ThemeToggleProps, ThemeToggleState> {
    private storeProvider: any;
    private unsubscribeStore: (() => void) | null = null;
    private animationFrame: number | null = null;

    constructor(props?: ThemeToggleProps) {
        super(props, {
            tagName: 'theme-toggle',
            version: '1.0.0',
            description: 'A theme toggle component for switching between light and dark modes'
        });

        this.storeProvider = (window as any).__STORE_PROVIDER__;
    }

    /**
     * Get default props
     */
    protected getDefaultProps(): Partial<ThemeToggleProps> {
        return {
            size: 'md',
            variant: 'icon',
            showLabel: false,
            ariaLabel: 'Toggle theme'
        };
    }

    /**
     * Get default state
     */
    protected getDefaultState(): Partial<ThemeToggleState> {
        return {
            currentTheme: 'light',
            isTransitioning: false,
            initialized: false
        };
    }

    /**
     * Setup event listeners
     */
    protected setupEventListeners(): void {
        // Add click listener for theme toggle
        this.addTypedEventListener('click', this.handleToggle.bind(this));

        // Add keyboard listener for accessibility
        this.addTypedEventListener('keydown', this.handleKeyDown.bind(this) as EventHandler<Event>);

        // Listen for theme changes from store
        this.subscribeToStore();
    }

    /**
     * Subscribe to store changes
     */
    private subscribeToStore(): void {
        if (!this.storeProvider) return;

        // Subscribe to theme state changes
        this.unsubscribeStore = this.storeProvider.subscribe((state: any) => {
            const currentTheme = ThemeSelectors.selectCurrentTheme(state);
            const isTransitioning = ThemeSelectors.selectIsTransitioning(state);
            const initialized = ThemeSelectors.selectIsInitialized(state);

            this.setState({
                currentTheme,
                isTransitioning,
                initialized
            });

            // Update ARIA attributes
            this.updateAriaAttributes(currentTheme);

            // Update animation state
            this.updateAnimationState(isTransitioning);
        });
    }

    /**
     * Handle theme toggle click
     */
    private handleToggle(event: Event): void {
        event.preventDefault();

        if (!this.storeProvider || this.state.isTransitioning) return;

        // Dispatch toggle theme action
        this.storeProvider.dispatch(ThemeThunks.toggleTheme());

        // Dispatch custom event for analytics or other listeners
        this.dispatchCustomEvent('theme-toggle', {
            newTheme: this.state.currentTheme === 'light' ? 'dark' : 'light',
            timestamp: Date.now()
        });
    }

    /**
     * Handle keyboard interactions for accessibility
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleToggle(event);
        }
    }

    /**
     * Update ARIA attributes based on current theme
     */
    private updateAriaAttributes(currentTheme: 'light' | 'dark'): void {
        const button = this.$<HTMLButtonElement>('button');
        if (button) {
            button.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
            button.setAttribute('aria-label',
                `${this.props.ariaLabel} (currently ${currentTheme} mode)`
            );
        }
    }

    /**
     * Update animation state
     */
    private updateAnimationState(isTransitioning: boolean): void {
        if (isTransitioning) {
            this.classList.add('theme-transitioning');
        } else {
            this.classList.remove('theme-transitioning');
        }
    }

    /**
     * Perform component render
     */
    protected performRender(): void {
        const { size, variant, showLabel } = this.props;
        const { currentTheme, isTransitioning, initialized } = this.state;

        // Don't render until initialized
        if (!initialized) {
            this.shadow.innerHTML = '<div class="theme-toggle-loading">Loading...</div>';
            return;
        }

        const sizeClass = `theme-toggle--${size}`;
        const variantClass = `theme-toggle--${variant}`;
        const themeClass = `theme-toggle--${currentTheme}`;
        const transitionClass = isTransitioning ? 'theme-toggle--transitioning' : '';

        const buttonClasses = [
            'theme-toggle__button',
            sizeClass,
            variantClass,
            themeClass,
            transitionClass
        ].filter(Boolean).join(' ');

        const icon = this.renderIcon(currentTheme);
        const label = showLabel ? this.renderLabel(currentTheme) : '';

        this.shadow.innerHTML = `
            <button
                class="${buttonClasses}"
                type="button"
                role="switch"
                aria-pressed="${currentTheme === 'dark'}"
                aria-label="${this.props.ariaLabel} (currently ${currentTheme} mode)"
                tabindex="0"
            >
                <span class="theme-toggle__icon" aria-hidden="true">
                    ${icon}
                </span>
                ${label}
                <span class="theme-toggle__ripple"></span>
            </button>
        `;

        // Add CSS for the component
        this.injectStyles();
    }

    /**
     * Render icon based on current theme
     */
    private renderIcon(theme: 'light' | 'dark'): string {
        if (theme === 'light') {
            return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/>
                    <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/>
                    <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        } else {
            return `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        }
    }

    /**
     * Render label text
     */
    private renderLabel(theme: 'light' | 'dark'): string {
        return `<span class="theme-toggle__label">${theme === 'light' ? 'Light' : 'Dark'} Mode</span>`;
    }

    /**
     * Inject component styles
     */
    private injectStyles(): void {
        const existingStyle = this.$<HTMLStyleElement>('style');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
                contain: layout;
            }

            .theme-toggle__button {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                padding: 0.5rem;
                border: 1px solid var(--color-border);
                border-radius: var(--border-radius-lg);
                background-color: var(--color-surface);
                color: var(--color-text);
                cursor: pointer;
                transition: all var(--transition-base);
                font-family: inherit;
                font-size: inherit;
                line-height: 1;
                user-select: none;
                overflow: hidden;
            }

            .theme-toggle__button:hover {
                background-color: var(--color-surface-elevated);
                transform: translateY(-1px);
                box-shadow: var(--shadow-md);
            }

            .theme-toggle__button:focus {
                outline: none;
                box-shadow: 0 0 0 var(--focus-ring-width) var(--focus-ring-color);
            }

            .theme-toggle__button:active {
                transform: translateY(0);
                box-shadow: var(--shadow-sm);
            }

            .theme-toggle__icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 1.25rem;
                height: 1.25rem;
                transition: transform var(--transition-base);
            }

            .theme-toggle__icon svg {
                width: 100%;
                height: 100%;
            }

            .theme-toggle__label {
                font-size: 0.875rem;
                font-weight: 500;
                transition: opacity var(--transition-base);
            }

            .theme-toggle__ripple {
                position: absolute;
                border-radius: 50%;
                background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
                transform: scale(0);
                opacity: 0;
                pointer-events: none;
            }

            .theme-toggle__button:active .theme-toggle__ripple {
                animation: ripple 0.6s linear;
            }

            .theme-toggle--transitioning .theme-toggle__icon {
                transform: rotate(180deg);
            }

            /* Size variants */
            .theme-toggle--sm {
                padding: 0.375rem;
            }

            .theme-toggle--sm .theme-toggle__icon {
                width: 1rem;
                height: 1rem;
            }

            .theme-toggle--lg {
                padding: 0.75rem;
            }

            .theme-toggle--lg .theme-toggle__icon {
                width: 1.5rem;
                height: 1.5rem;
            }

            /* Variant styles */
            .theme-toggle--minimal {
                border: none;
                background: transparent;
                padding: 0.25rem;
            }

            .theme-toggle--minimal:hover {
                background-color: var(--color-surface-elevated);
            }

            .theme-toggle--text {
                padding: 0.5rem 1rem;
            }

            /* Theme-specific styling */
            .theme-toggle--dark {
                background-color: var(--color-primary);
                color: var(--color-text-inverse);
                border-color: var(--color-primary);
            }

            .theme-toggle--dark:hover {
                background-color: var(--color-primary);
                opacity: 0.9;
            }

            /* Loading state */
            .theme-toggle-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.5rem;
                color: var(--color-text-muted);
                font-size: 0.875rem;
            }

            /* Accessibility improvements */
            @media (prefers-reduced-motion: reduce) {
                .theme-toggle__button,
                .theme-toggle__icon,
                .theme-toggle__label {
                    transition: none;
                }

                .theme-toggle--transitioning .theme-toggle__icon {
                    transform: none;
                }
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                .theme-toggle__button {
                    border-width: 2px;
                }

                .theme-toggle--dark {
                    background-color: #000000;
                    color: #ffffff;
                    border-color: #000000;
                }
            }

            /* Ripple animation */
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }

            /* Focus visible for better accessibility */
            .theme-toggle__button:focus-visible {
                outline: var(--focus-ring-width) solid var(--focus-ring-color);
                outline-offset: 2px;
            }
        `;

        this.shadow.appendChild(style);
    }

    /**
     * Cleanup component resources
     */
    protected cleanup(): void {
        if (this.unsubscribeStore) {
            this.unsubscribeStore();
            this.unsubscribeStore = null;
        }

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        super.cleanup();
    }

    /**
     * Handle attribute changes
     */
    static get observedAttributes(): string[] {
        return ['size', 'variant', 'show-label', 'aria-label'];
    }

    /**
     * Called when attributes change
     */
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        if (oldValue !== newValue) {
            switch (name) {
                case 'size':
                    this.updateProps({ size: newValue as 'sm' | 'md' | 'lg' });
                    break;
                case 'variant':
                    this.updateProps({ variant: newValue as 'icon' | 'text' | 'minimal' });
                    break;
                case 'show-label':
                    this.updateProps({ showLabel: newValue === 'true' });
                    break;
                case 'aria-label':
                    this.updateProps({ ariaLabel: newValue });
                    break;
            }
        }
    }
}

// Register the component
if (typeof window !== 'undefined' && window.customElements) {
    customElements.define('theme-toggle', ThemeToggleComponent);
}