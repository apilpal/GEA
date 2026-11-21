import { createAction, createAsyncAction } from '@/ts/store/core/actions';
import { ThemeVariant, ThemeConfig, ThemeTransitionOptions } from './types';

/**
 * Theme action types
 */
export const ThemeActionTypes = {
    // Theme variant actions
    SET_THEME_VARIANT: 'THEME_SET_VARIANT',
    TOGGLE_THEME: 'THEME_TOGGLE',

    // Theme configuration actions
    SET_THEME_CONFIG: 'THEME_SET_CONFIG',
    UPDATE_THEME_CONFIG: 'THEME_UPDATE_CONFIG',

    // System preference actions
    DETECT_SYSTEM_PREFERENCE: 'THEME_DETECT_SYSTEM_PREFERENCE',
    SYSTEM_PREFERENCE_CHANGED: 'THEME_SYSTEM_PREFERENCE_CHANGED',

    // Accessibility actions
    SET_REDUCED_MOTION: 'THEME_SET_REDUCED_MOTION',
    SET_HIGH_CONTRAST: 'THEME_SET_HIGH_CONTRAST',

    // Transition actions
    START_THEME_TRANSITION: 'THEME_START_TRANSITION',
    END_THEME_TRANSITION: 'THEME_END_TRANSITION',

    // Persistence actions
    SAVE_THEME_CONFIG: 'THEME_SAVE_CONFIG',
    LOAD_THEME_CONFIG: 'THEME_LOAD_CONFIG',

    // Initialization actions
    INITIALIZE_THEME: 'THEME_INITIALIZE',
    THEME_INITIALIZED: 'THEME_INITIALIZED'
} as const;

/**
 * Theme actions
 */
export const ThemeActions = {
    // Theme variant actions
    setThemeVariant: (variant: ThemeVariant) =>
        createAction(ThemeActionTypes.SET_THEME_VARIANT)(variant),

    toggleTheme: () =>
        createAction(ThemeActionTypes.TOGGLE_THEME)(),

    // Theme configuration actions
    setThemeConfig: (config: ThemeConfig) =>
        createAction(ThemeActionTypes.SET_THEME_CONFIG)(config),

    updateThemeConfig: (updates: Partial<ThemeConfig>) =>
        createAction(ThemeActionTypes.UPDATE_THEME_CONFIG)(updates),

    // System preference actions
    detectSystemPreference: createAsyncAction(ThemeActionTypes.DETECT_SYSTEM_PREFERENCE),
    systemPreferenceChanged: (preference: 'light' | 'dark') =>
        createAction(ThemeActionTypes.SYSTEM_PREFERENCE_CHANGED)(preference),

    // Accessibility actions
    setReducedMotion: (enabled: boolean) =>
        createAction(ThemeActionTypes.SET_REDUCED_MOTION)(enabled),

    setHighContrast: (enabled: boolean) =>
        createAction(ThemeActionTypes.SET_HIGH_CONTRAST)(enabled),

    // Transition actions
    startThemeTransition: (options?: ThemeTransitionOptions) =>
        createAction(ThemeActionTypes.START_THEME_TRANSITION)(options),

    endThemeTransition: () =>
        createAction(ThemeActionTypes.END_THEME_TRANSITION)(),

    // Persistence actions
    saveThemeConfig: createAsyncAction(ThemeActionTypes.SAVE_THEME_CONFIG),
    loadThemeConfig: createAsyncAction(ThemeActionTypes.LOAD_THEME_CONFIG),

    // Initialization actions
    initializeTheme: createAsyncAction(ThemeActionTypes.INITIALIZE_THEME),
    themeInitialized: (initialized: boolean) =>
        createAction(ThemeActionTypes.THEME_INITIALIZED)(initialized)
};

/**
 * Theme action type guards
 */
export const ThemeActionGuards = {
    isSetThemeVariant: (action: any): action is ReturnType<typeof ThemeActions.setThemeVariant> =>
        action.type === ThemeActionTypes.SET_THEME_VARIANT,

    isToggleTheme: (action: any): action is ReturnType<typeof ThemeActions.toggleTheme> =>
        action.type === ThemeActionTypes.TOGGLE_THEME,

    isSetThemeConfig: (action: any): action is ReturnType<typeof ThemeActions.setThemeConfig> =>
        action.type === ThemeActionTypes.SET_THEME_CONFIG,

    isUpdateThemeConfig: (action: any): action is ReturnType<typeof ThemeActions.updateThemeConfig> =>
        action.type === ThemeActionTypes.UPDATE_THEME_CONFIG,

    isSystemPreferenceChanged: (action: any): action is ReturnType<typeof ThemeActions.systemPreferenceChanged> =>
        action.type === ThemeActionTypes.SYSTEM_PREFERENCE_CHANGED,

    isSetReducedMotion: (action: any): action is ReturnType<typeof ThemeActions.setReducedMotion> =>
        action.type === ThemeActionTypes.SET_REDUCED_MOTION,

    isSetHighContrast: (action: any): action is ReturnType<typeof ThemeActions.setHighContrast> =>
        action.type === ThemeActionTypes.SET_HIGH_CONTRAST,

    isStartThemeTransition: (action: any): action is ReturnType<typeof ThemeActions.startThemeTransition> =>
        action.type === ThemeActionTypes.START_THEME_TRANSITION,

    isEndThemeTransition: (action: any): action is ReturnType<typeof ThemeActions.endThemeTransition> =>
        action.type === ThemeActionTypes.END_THEME_TRANSITION,

    isThemeInitialized: (action: any): action is ReturnType<typeof ThemeActions.themeInitialized> =>
        action.type === ThemeActionTypes.THEME_INITIALIZED
};