import { ThemeActions, ThemeActionTypes } from './actions';
import { ThemeConfig, ThemeVariant, THEME_STORAGE_KEYS } from './types';

/**
 * Theme thunks for async operations
 */
export const ThemeThunks = {
    /**
     * Initialize theme system by detecting system preference and loading saved config
     */
    initializeTheme: () => async (dispatch: any) => {
        dispatch(ThemeActions.initializeTheme.request());

        try {
            // Detect system preference
            await dispatch(ThemeThunks.detectSystemPreference());

            // Load saved configuration
            await dispatch(ThemeThunks.loadThemeConfig());

            dispatch(ThemeActions.initializeTheme.success());
        } catch (error) {
            dispatch(ThemeActions.initializeTheme.failure(error as Error));
        }
    },

    /**
     * Detect system color scheme preference
     */
    detectSystemPreference: () => async (dispatch: any) => {
        dispatch(ThemeActions.detectSystemPreference.request());

        try {
            // Check if window.matchMedia is available (browser environment)
            if (typeof window !== 'undefined' && window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const preference = mediaQuery.matches ? 'dark' : 'light';

                dispatch(ThemeActions.detectSystemPreference.success(preference));

                // Also dispatch system preference changed action
                dispatch(ThemeActions.systemPreferenceChanged(preference));

                // Listen for changes
                mediaQuery.addEventListener('change', (e) => {
                    const newPreference = e.matches ? 'dark' : 'light';
                    dispatch(ThemeActions.systemPreferenceChanged(newPreference));
                });
            } else {
                // Fallback for non-browser environments
                dispatch(ThemeActions.detectSystemPreference.success('light'));
            }
        } catch (error) {
            dispatch(ThemeActions.detectSystemPreference.failure(error as Error));
        }
    },

    /**
     * Load theme configuration from storage
     */
    loadThemeConfig: () => async (dispatch: any) => {
        dispatch(ThemeActions.loadThemeConfig.request());

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const savedConfig = localStorage.getItem(THEME_STORAGE_KEYS.CONFIG);

                if (savedConfig) {
                    const config: Partial<ThemeConfig> = JSON.parse(savedConfig);
                    dispatch(ThemeActions.updateThemeConfig(config));
                }
            }

            dispatch(ThemeActions.loadThemeConfig.success());
        } catch (error) {
            dispatch(ThemeActions.loadThemeConfig.failure(error as Error));
        }
    },

    /**
     * Save theme configuration to storage
     */
    saveThemeConfig: () => async (dispatch: any, getState: any) => {
        dispatch(ThemeActions.saveThemeConfig.request());

        try {
            const state = getState();
            const configForStorage = state.theme?.config;

            if (configForStorage && typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(THEME_STORAGE_KEYS.CONFIG, JSON.stringify(configForStorage));
            }

            dispatch(ThemeActions.saveThemeConfig.success());
        } catch (error) {
            dispatch(ThemeActions.saveThemeConfig.failure(error as Error));
        }
    },

    /**
     * Set theme variant and save to storage
     */
    setThemeVariant: (variant: ThemeVariant) => async (dispatch: any) => {
        dispatch(ThemeActions.setThemeVariant(variant));

        // Save to storage after setting
        setTimeout(() => {
            dispatch(ThemeThunks.saveThemeConfig());
        }, 100);
    },

    /**
     * Toggle between light and dark themes
     */
    toggleTheme: () => async (dispatch: any, getState: any) => {
        const state = getState();
        const currentTheme = state.theme?.resolved?.current;

        if (currentTheme) {
            const newVariant = currentTheme === 'light' ? 'dark' : 'light';
            await dispatch(ThemeThunks.setThemeVariant(newVariant));
        }
    },

    /**
     * Update theme configuration and save to storage
     */
    updateThemeConfig: (updates: Partial<ThemeConfig>) => async (dispatch: any) => {
        dispatch(ThemeActions.updateThemeConfig(updates));

        // Save to storage after updating
        setTimeout(() => {
            dispatch(ThemeThunks.saveThemeConfig());
        }, 100);
    },

    /**
     * Set reduced motion preference
     */
    setReducedMotion: (enabled: boolean) => async (dispatch: any) => {
        dispatch(ThemeActions.setReducedMotion(enabled));

        // Save to storage after setting
        setTimeout(() => {
            dispatch(ThemeThunks.saveThemeConfig());
        }, 100);
    },

    /**
     * Set high contrast preference
     */
    setHighContrast: (enabled: boolean) => async (dispatch: any) => {
        dispatch(ThemeActions.setHighContrast(enabled));

        // Save to storage after setting
        setTimeout(() => {
            dispatch(ThemeThunks.saveThemeConfig());
        }, 100);
    },

    /**
     * Apply theme with transition
     */
    applyThemeWithTransition: (variant: ThemeVariant, transitionDuration?: number) => async (dispatch: any) => {
        // Start transition
        dispatch(ThemeActions.startThemeTransition({
            duration: transitionDuration || 300
        }));

        // Set theme variant
        dispatch(ThemeActions.setThemeVariant(variant));

        // End transition after duration
        const duration = transitionDuration || 300;
        setTimeout(() => {
            dispatch(ThemeActions.endThemeTransition());
        }, duration);
    },

    /**
     * Reset theme to default configuration
     */
    resetTheme: () => async (dispatch: any) => {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(THEME_STORAGE_KEYS.CONFIG);
        }

        dispatch(ThemeActions.setThemeConfig({
            variant: 'auto',
            systemPreference: 'light',
            reducedMotion: false,
            highContrast: false,
            transitionDuration: 300
        }));

        // Save reset configuration
        setTimeout(() => {
            dispatch(ThemeThunks.saveThemeConfig());
        }, 100);
    }
};