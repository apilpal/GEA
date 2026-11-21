import { ThemeStore, createThemeStore } from '@/ts/store/theme';
import { StoreProvider } from '@/ts/store/components/store-provider';

/**
 * Theme store provider props
 */
export interface ThemeStoreProviderProps {
    children?: HTMLElement | HTMLElement[];
    enableDevTools?: boolean;
    persistToStorage?: boolean;
}

/**
 * Theme store provider component that wraps the application with theme store context
 */
export class ThemeStoreProvider extends StoreProvider {
    private themeStore: ReturnType<typeof createThemeStore>;
    private initialized: boolean = false;

    constructor(props?: ThemeStoreProviderProps) {
        super();

        this.themeStore = createThemeStore();

        // Initialize theme system
        this.initializeTheme();
    }

    /**
     * Initialize the theme system
     */
    private async initializeTheme(): Promise<void> {
        if (this.initialized) return;

        try {
            // Dispatch theme initialization
            this.themeStore.dispatch(ThemeStore.thunks.initializeTheme());

            this.initialized = true;

            // Apply theme to document root
            this.applyThemeToDocument();

            // Listen for theme changes and update document
            this.subscribeToThemeChanges();

        } catch (error) {
            console.error('Failed to initialize theme system:', error);
        }
    }

    /**
     * Apply current theme to document root element
     */
    private applyThemeToDocument(): void {
        const state = this.themeStore.getState();
        const currentTheme = ThemeStore.selectors.selectCurrentTheme(state);
        const highContrast = ThemeStore.selectors.selectHighContrast(state);
        const reducedMotion = ThemeStore.selectors.selectReducedMotion(state);

        if (currentTheme && document.documentElement) {
            // Remove existing theme classes
            document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast');

            // Add current theme class
            document.documentElement.classList.add(`theme-${currentTheme}`);

            // Set data attribute for CSS custom properties
            document.documentElement.setAttribute('data-theme', currentTheme);

            // Apply high contrast if enabled
            if (highContrast) {
                document.documentElement.setAttribute('data-theme', 'high-contrast');
                document.documentElement.classList.add('theme-high-contrast');
            }

            // Apply reduced motion if enabled
            if (reducedMotion) {
                document.documentElement.style.setProperty('--transition-fast', '0ms');
                document.documentElement.style.setProperty('--transition-base', '0ms');
                document.documentElement.style.setProperty('--transition-slow', '0ms');
            }
        }
    }

    /**
     * Subscribe to theme changes and update document accordingly
     */
    private subscribeToThemeChanges(): void {
        this.themeStore.subscribe(() => {
            this.applyThemeToDocument();
        });
    }

    /**
     * Get the theme store instance
     */
    public getThemeStore(): ReturnType<typeof createThemeStore> {
        return this.themeStore;
    }

    /**
     * Get current theme state
     */
    public getCurrentTheme(): 'light' | 'dark' {
        const state = this.themeStore.getState();
        return ThemeStore.selectors.selectCurrentTheme(state) || 'light';
    }

    /**
     * Get theme configuration
     */
    public getThemeConfig() {
        const state = this.themeStore.getState();
        return ThemeStore.selectors.selectThemeConfig(state);
    }

    /**
     * Toggle theme programmatically
     */
    public async toggleTheme(): Promise<void> {
        this.themeStore.dispatch(ThemeStore.thunks.toggleTheme());
    }

    /**
     * Set theme variant programmatically
     */
    public async setThemeVariant(variant: 'light' | 'dark' | 'auto'): Promise<void> {
        this.themeStore.dispatch(ThemeStore.thunks.setThemeVariant(variant));
    }

    /**
     * Set reduced motion preference
     */
    public async setReducedMotion(enabled: boolean): Promise<void> {
        this.themeStore.dispatch(ThemeStore.thunks.setReducedMotion(enabled));
    }

    /**
     * Set high contrast preference
     */
    public async setHighContrast(enabled: boolean): Promise<void> {
        this.themeStore.dispatch(ThemeStore.thunks.setHighContrast(enabled));
    }

    /**
     * Connected callback - override to ensure theme is applied
     */
    connectedCallback(): void {
        super.connectedCallback();

        // Ensure theme is applied when component is connected
        if (this.initialized) {
            this.applyThemeToDocument();
        }
    }

    /**
     * Disconnected callback - cleanup
     */
    disconnectedCallback(): void {
        super.disconnectedCallback();
    }
}

// Register the component globally
if (typeof window !== 'undefined') {
    // Make theme store provider available globally for components
    (window as any).__THEME_STORE_PROVIDER__ = ThemeStoreProvider;
}