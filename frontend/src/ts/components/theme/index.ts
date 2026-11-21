// Theme components module
export * from './theme-toggle-component';
export * from './theme-store-provider';

// Re-export theme store for convenience
export * from '@/ts/store/theme';

// Theme component registry
import { ThemeToggleComponent } from './theme-toggle-component';
import { ThemeStoreProvider } from './theme-store-provider';

/**
 * Theme components registry for easy importing
 */
export const ThemeComponents = {
    ThemeToggle: ThemeToggleComponent,
    ThemeStoreProvider: ThemeStoreProvider
};

/**
 * Initialize theme system
 * Call this function to set up the theme system in your application
 */
export function initializeThemeSystem(): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            // Ensure theme store provider is available globally
            if (typeof window !== 'undefined') {
                (window as any).__THEME_STORE_PROVIDER__ = ThemeStoreProvider;
            }

            // Register theme components
            if (typeof window !== 'undefined' && window.customElements) {
                if (!customElements.get('theme-toggle')) {
                    customElements.define('theme-toggle', ThemeToggleComponent);
                }
                if (!customElements.get('theme-store-provider')) {
                    customElements.define('theme-store-provider', ThemeStoreProvider);
                }
            }

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Theme utility functions for programmatic access
 */
export const ThemeUtils = {
    /**
     * Get current theme from document
     */
    getCurrentTheme(): 'light' | 'dark' {
        if (typeof document !== 'undefined') {
            const dataTheme = document.documentElement.getAttribute('data-theme');
            if (dataTheme === 'light' || dataTheme === 'dark') {
                return dataTheme;
            }
        }
        return 'light';
    },

    /**
     * Check if high contrast mode is active
     */
    isHighContrast(): boolean {
        if (typeof document !== 'undefined') {
            return document.documentElement.hasAttribute('data-theme') &&
                   document.documentElement.getAttribute('data-theme') === 'high-contrast';
        }
        return false;
    },

    /**
     * Check if reduced motion is enabled
     */
    isReducedMotion(): boolean {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    },

    /**
     * Apply theme class to element
     */
    applyThemeToElement(element: HTMLElement, theme: 'light' | 'dark' | 'high-contrast'): void {
        element.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast');
        element.classList.add(`theme-${theme}`);
        element.setAttribute('data-theme', theme);
    },

    /**
     * Remove theme classes from element
     */
    removeThemeFromElement(element: HTMLElement): void {
        element.classList.remove('theme-light', 'theme-dark', 'theme-high-contrast');
        element.removeAttribute('data-theme');
    }
};