import { createSelector } from '@/ts/store/core/selectors-simple';
import { ThemeState, ThemeVariant, ResolvedTheme } from './types';

/**
 * Base theme state selector
 */
export const selectThemeState = (state: { theme: ThemeState }): ThemeState => state.theme;

/**
 * Theme configuration selectors
 */
export const selectThemeConfig = createSelector(
    [selectThemeState],
    (theme) => theme.config
);

export const selectThemeVariant = createSelector(
    [selectThemeState],
    (theme) => theme.config.variant
);

export const selectSystemPreference = createSelector(
    [selectThemeState],
    (theme) => theme.resolved.systemPreference
);

export const selectReducedMotion = createSelector(
    [selectThemeState],
    (theme) => theme.config.reducedMotion
);

export const selectHighContrast = createSelector(
    [selectThemeState],
    (theme) => theme.config.highContrast
);

export const selectTransitionDuration = createSelector(
    [selectThemeState],
    (theme) => theme.config.transitionDuration
);

/**
 * Resolved theme selectors
 */
export const selectResolvedTheme = createSelector(
    [selectThemeState],
    (theme) => theme.resolved
);

export const selectCurrentTheme = createSelector(
    [selectThemeState],
    (theme) => theme.resolved.current
);

export const selectIsLightTheme = createSelector(
    [selectThemeState],
    (theme) => theme.resolved.current === 'light'
);

export const selectIsDarkTheme = createSelector(
    [selectThemeState],
    (theme) => theme.resolved.current === 'dark'
);

export const selectIsAutoTheme = createSelector(
    [selectThemeState],
    (theme) => theme.config.variant === 'auto'
);

/**
 * Theme status selectors
 */
export const selectIsInitialized = createSelector(
    [selectThemeState],
    (theme) => theme.initialized
);

export const selectIsTransitioning = createSelector(
    [selectThemeState],
    (theme) => theme.transitioning
);

export const selectIsLoading = createSelector(
    [selectThemeState],
    (theme) => !theme.initialized
);

/**
 * Computed theme selectors
 */
export const selectEffectiveTheme = createSelector(
    [selectThemeState],
    (theme) => theme.resolved.current
);

export const selectThemeClassName = createSelector(
    [selectThemeState],
    (theme) => `theme-${theme.resolved.current}`
);

export const selectTransitionClassName = createSelector(
    [selectThemeState],
    (theme) => theme.transitioning ? 'theme-transitioning' : ''
);

export const selectThemeCSSClasses = createSelector(
    [selectThemeClassName, selectTransitionClassName],
    (themeClass, transitionClass) => [themeClass, transitionClass].filter(Boolean).join(' ')
);

export const selectShouldReduceMotion = createSelector(
    [selectThemeState],
    (theme) => theme.config.reducedMotion
);

export const selectIsHighContrast = createSelector(
    [selectThemeState],
    (theme) => theme.config.highContrast
);

export const selectThemeConfigForStorage = createSelector(
    [selectThemeState],
    (theme) => ({
        variant: theme.config.variant,
        reducedMotion: theme.config.reducedMotion,
        highContrast: theme.config.highContrast,
        transitionDuration: theme.config.transitionDuration
    })
);

/**
 * Theme utility selectors
 */
export const selectOppositeTheme = createSelector(
    [selectThemeState],
    (theme) => theme.resolved.current === 'light' ? 'dark' : 'light'
);

export const selectAvailableThemeOptions = createSelector(
    [selectThemeState],
    (theme) => {
        const options = [
            { value: 'light' as ThemeVariant, label: 'Light' },
            { value: 'dark' as ThemeVariant, label: 'Dark' }
        ];

        if (theme.resolved.systemPreference) {
            options.push({ value: 'auto' as ThemeVariant, label: 'Auto' });
        }

        return options;
    }
);

export const selectThemeDisplayInfo = createSelector(
    [selectThemeState],
    (theme) => ({
        current: theme.resolved.current,
        variant: theme.config.variant,
        systemPreference: theme.resolved.systemPreference,
        isTransitioning: theme.transitioning,
        isInitialized: theme.initialized
    })
);

/**
 * Complete theme selectors object
 */
export const ThemeSelectors = {
    // Configuration selectors
    selectThemeConfig,
    selectThemeVariant,
    selectSystemPreference,
    selectReducedMotion,
    selectHighContrast,
    selectTransitionDuration,

    // Resolved theme selectors
    selectResolvedTheme,
    selectCurrentTheme,
    selectIsLightTheme,
    selectIsDarkTheme,
    selectIsAutoTheme,

    // Status selectors
    selectIsInitialized,
    selectIsTransitioning,
    selectIsLoading,

    // Computed selectors
    selectEffectiveTheme,
    selectThemeClassName,
    selectTransitionClassName,
    selectThemeCSSClasses,
    selectShouldReduceMotion,
    selectIsHighContrast,
    selectThemeConfigForStorage,

    // Utility selectors
    selectOppositeTheme,
    selectAvailableThemeOptions,
    selectThemeDisplayInfo,

    // Direct access to state
    selectState: selectThemeState
};