import { ThemeSelectors } from '@/ts/store/theme/selectors';
import { ThemeThunks } from '@/ts/store/theme/thunks';
import { ThemeVariant, ThemeConfig } from '@/ts/store/theme/types';

// Fix import path issues for services directory
const themeSelectors = require('../store/theme/selectors').ThemeSelectors;
const themeThunks = require('../store/theme/thunks').ThemeThunks;

/**
 * Advanced theme service for comprehensive theme management
 */
export class ThemeService {
    private static instance: ThemeService;
    private storeProvider: any;
    private mediaQueryListeners: Map<string, MediaQueryList> = new Map();
    private themeChangeListeners: Set<(theme: 'light' | 'dark') => void> = new Set();

    private constructor() {
        this.initialize();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ThemeService {
        if (!ThemeService.instance) {
            ThemeService.instance = new ThemeService();
        }
        return ThemeService.instance;
    }

    /**
     * Initialize the theme service
     */
    private initialize(): void {
        // Wait for store provider to be available
        this.waitForStoreProvider().then(() => {
            this.setupSystemPreferenceDetection();
            this.setupThemeChangeListeners();
            this.setupKeyboardShortcuts();
        });
    }

    /**
     * Wait for store provider to be available
     */
    private async waitForStoreProvider(): Promise<void> {
        return new Promise((resolve) => {
            const checkProvider = () => {
                this.storeProvider = (window as any).__STORE_PROVIDER__;
                if (this.storeProvider) {
                    resolve();
                } else {
                    setTimeout(checkProvider, 100);
                }
            };
            checkProvider();
        });
    }

    /**
     * Setup system preference detection
     */
    private setupSystemPreferenceDetection(): void {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        // Listen for system theme preference changes
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

        // Initial system preference detection
        this.handleSystemPreferenceChange(darkModeQuery, reducedMotionQuery, highContrastQuery);

        // Create event handler wrapper
        const handleChange = () =>
            this.handleSystemPreferenceChange(darkModeQuery, reducedMotionQuery, highContrastQuery);

        // Listen for changes
        darkModeQuery.addEventListener('change', handleChange);

        // Store listeners for cleanup with their handlers
        this.mediaQueryListeners.set('darkMode', darkModeQuery);
    }

    /**
     * Handle system preference changes
     */
    private handleSystemPreferenceChange(
        darkModeQuery: MediaQueryList,
        reducedMotionQuery: MediaQueryList,
        highContrastQuery: MediaQueryList
    ): void {
        if (!this.storeProvider) return;

        // Update system preference in store
        const systemPreference = darkModeQuery.matches ? 'dark' : 'light';
        this.storeProvider.dispatch({ type: 'THEME_SYSTEM_PREFERENCE_CHANGED', payload: systemPreference });

        // Auto-update theme preferences based on system settings
        const state = this.storeProvider.getState();
        const currentVariant = ThemeSelectors.selectThemeVariant(state);

        if (currentVariant === 'auto') {
            // Apply system preference
            this.applyTheme(systemPreference);
        }

        // Update accessibility preferences
        this.storeProvider.dispatch({ type: 'THEME_SET_REDUCED_MOTION', payload: reducedMotionQuery.matches });
        this.storeProvider.dispatch({ type: 'THEME_SET_HIGH_CONTRAST', payload: highContrastQuery.matches });
    }

    /**
     * Setup theme change listeners for custom events
     */
    private setupThemeChangeListeners(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('theme-change', (event: any) => {
            const { theme } = event.detail || {};
            if (theme) {
                this.applyTheme(theme);
            }
        });
    }

    /**
     * Setup keyboard shortcuts for theme switching
     */
    private setupKeyboardShortcuts(): void {
        if (typeof window === 'undefined') return;

        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Shift + T to toggle theme
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
                event.preventDefault();
                this.toggleTheme();
            }

            // Ctrl/Cmd + Shift + L for light theme
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
                event.preventDefault();
                this.setTheme('light');
            }

            // Ctrl/Cmd + Shift + D for dark theme
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                this.setTheme('dark');
            }
        });
    }

    /**
     * Apply theme with transition
     */
    public async applyTheme(theme: 'light' | 'dark', transitionDuration?: number): Promise<void> {
        if (!this.storeProvider) return;

        // Start transition
        this.storeProvider.dispatch({
            type: 'THEME_START_TRANSITION',
            payload: { duration: transitionDuration || 300 }
        });

        // Apply theme
        await this.setTheme(theme);

        // End transition after duration
        setTimeout(() => {
            this.storeProvider.dispatch({ type: 'THEME_END_TRANSITION' });
        }, transitionDuration || 300);
    }

    /**
     * Set theme variant
     */
    public async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
        if (!this.storeProvider) return;

        this.storeProvider.dispatch(ThemeThunks.setThemeVariant(theme));

        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('theme-change', {
            detail: { theme, timestamp: Date.now() }
        }));

        // Notify listeners (only notify for actual light/dark themes, not auto)
        if (theme !== 'auto') {
            this.themeChangeListeners.forEach(listener => listener(theme));
        }
    }

    /**
     * Toggle between light and dark themes
     */
    public async toggleTheme(): Promise<void> {
        if (!this.storeProvider) return;

        const state = this.storeProvider.getState();
        const currentTheme = ThemeSelectors.selectCurrentTheme(state);
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        await this.setTheme(newTheme);
    }

    /**
     * Set reduced motion preference
     */
    public async setReducedMotion(enabled: boolean): Promise<void> {
        if (!this.storeProvider) return;

        this.storeProvider.dispatch(ThemeThunks.setReducedMotion(enabled));

        // Apply to document
        if (typeof document !== 'undefined') {
            if (enabled) {
                document.documentElement.style.setProperty('--transition-fast', '0ms');
                document.documentElement.style.setProperty('--transition-base', '0ms');
                document.documentElement.style.setProperty('--transition-slow', '0ms');
            } else {
                document.documentElement.style.removeProperty('--transition-fast');
                document.documentElement.style.removeProperty('--transition-base');
                document.documentElement.style.removeProperty('--transition-slow');
            }
        }
    }

    /**
     * Set high contrast preference
     */
    public async setHighContrast(enabled: boolean): Promise<void> {
        if (!this.storeProvider) return;

        this.storeProvider.dispatch(ThemeThunks.setHighContrast(enabled));

        // Apply to document
        if (typeof document !== 'undefined') {
            if (enabled) {
                document.documentElement.setAttribute('data-theme', 'high-contrast');
                document.documentElement.classList.add('theme-high-contrast');
            } else {
                const currentTheme = this.getCurrentTheme();
                document.documentElement.setAttribute('data-theme', currentTheme);
                document.documentElement.classList.remove('theme-high-contrast');
            }
        }
    }

    /**
     * Get current theme
     */
    public getCurrentTheme(): 'light' | 'dark' {
        if (!this.storeProvider) return 'light';

        const state = this.storeProvider.getState();
        return ThemeSelectors.selectCurrentTheme(state) || 'light';
    }

    /**
     * Get theme configuration
     */
    public getThemeConfig(): ThemeConfig | null {
        if (!this.storeProvider) return null;

        const state = this.storeProvider.getState();
        return ThemeSelectors.selectThemeConfig(state);
    }

    /**
     * Check if reduced motion is enabled
     */
    public isReducedMotion(): boolean {
        if (!this.storeProvider) return false;

        const state = this.storeProvider.getState();
        return ThemeSelectors.selectReducedMotion(state);
    }

    /**
     * Check if high contrast is enabled
     */
    public isHighContrast(): boolean {
        if (!this.storeProvider) return false;

        const state = this.storeProvider.getState();
        return ThemeSelectors.selectHighContrast(state);
    }

    /**
     * Subscribe to theme changes
     */
    public onThemeChange(listener: (theme: 'light' | 'dark') => void): () => void {
        this.themeChangeListeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.themeChangeListeners.delete(listener);
        };
    }

    /**
     * Create theme preview (advanced feature)
     */
    public createThemePreview(theme: 'light' | 'dark'): string {
        // Create a mini preview of how components would look in the given theme
        const previewStyles = this.generatePreviewStyles(theme);
        return `
            <div class="theme-preview theme-preview--${theme}" style="${previewStyles}">
                <div class="theme-preview__card">
                    <div class="theme-preview__header"></div>
                    <div class="theme-preview__body">
                        <div class="theme-preview__text">Preview</div>
                        <div class="theme-preview__button"></div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate CSS styles for theme preview
     */
    private generatePreviewStyles(theme: 'light' | 'dark'): string {
        const isDark = theme === 'dark';
        return `
            background: ${isDark ? '#1f2937' : '#f5f7fa'};
            padding: 1rem;
            border-radius: 0.5rem;
            border: 1px solid ${isDark ? '#374151' : '#e5e7eb'};
        `;
    }

    /**
     * Export theme configuration for sharing
     */
    public exportThemeConfig(): string {
        const config = this.getThemeConfig();
        if (!config) return '';

        return JSON.stringify({
            variant: config.variant,
            reducedMotion: config.reducedMotion,
            highContrast: config.highContrast,
            timestamp: Date.now()
        }, null, 2);
    }

    /**
     * Import theme configuration
     */
    public async importThemeConfig(configJson: string): Promise<void> {
        try {
            const config = JSON.parse(configJson);

            if (config.variant) {
                await this.setTheme(config.variant);
            }

            if (typeof config.reducedMotion === 'boolean') {
                await this.setReducedMotion(config.reducedMotion);
            }

            if (typeof config.highContrast === 'boolean') {
                await this.setHighContrast(config.highContrast);
            }
        } catch (error) {
            throw new Error('Invalid theme configuration format');
        }
    }

    /**
     * Reset theme to defaults
     */
    public async resetToDefaults(): Promise<void> {
        if (!this.storeProvider) return;

        this.storeProvider.dispatch({
            type: 'THEME_SET_CONFIG',
            payload: {
                variant: 'auto',
                systemPreference: 'light',
                reducedMotion: false,
                highContrast: false,
                transitionDuration: 300
            }
        });
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        // Clear media query listeners map
        // Note: Media query listeners are automatically cleaned up by the browser
        this.mediaQueryListeners.clear();

        // Clear theme change listeners
        this.themeChangeListeners.clear();

        // Clear store provider reference
        this.storeProvider = null;
    }
}

// Export singleton instance
export const themeService = ThemeService.getInstance();

// Export convenience functions
export const Theme = {
    getCurrent: () => themeService.getCurrentTheme(),
    set: (theme: 'light' | 'dark' | 'auto') => themeService.setTheme(theme),
    toggle: () => themeService.toggleTheme(),
    setReducedMotion: (enabled: boolean) => themeService.setReducedMotion(enabled),
    setHighContrast: (enabled: boolean) => themeService.setHighContrast(enabled),
    isReducedMotion: () => themeService.isReducedMotion(),
    isHighContrast: () => themeService.isHighContrast(),
    onChange: (listener: (theme: 'light' | 'dark') => void) => themeService.onThemeChange(listener),
    createPreview: (theme: 'light' | 'dark') => themeService.createThemePreview(theme),
    exportConfig: () => themeService.exportThemeConfig(),
    importConfig: (config: string) => themeService.importThemeConfig(config),
    reset: () => themeService.resetToDefaults()
};