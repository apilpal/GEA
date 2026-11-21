import { createReducer } from '@/ts/store/core/reducers';
import { ThemeState, INITIAL_THEME_STATE, ThemeConfig, ResolvedTheme, ThemeVariant } from './types';
import { ThemeActions, ThemeActionTypes } from './actions';

/**
 * Helper function to resolve current theme based on variant and system preference
 */
function resolveTheme(config: ThemeConfig, systemPreference: 'light' | 'dark'): ResolvedTheme {
    let current: 'light' | 'dark' = 'light';

    if (config.variant === 'light') {
        current = 'light';
    } else if (config.variant === 'dark') {
        current = 'dark';
    } else if (config.variant === 'auto') {
        current = systemPreference;
    }

    return {
        current,
        variant: config.variant,
        systemPreference
    };
}

/**
 * Helper function to update theme configuration
 */
function updateThemeConfig(state: ThemeState, updates: Partial<ThemeConfig>): ThemeState {
    const newConfig = { ...state.config, ...updates };
    return {
        ...state,
        config: newConfig,
        resolved: resolveTheme(newConfig, state.resolved.systemPreference || 'light')
    };
}

/**
 * Helper function to handle theme variant change
 */
function handleThemeVariantChange(state: ThemeState, variant: ThemeVariant): ThemeState {
    const newConfig = { ...state.config, variant };
    return {
        ...state,
        config: newConfig,
        resolved: resolveTheme(newConfig, state.resolved.systemPreference || 'light')
    };
}

/**
 * Helper function to handle system preference change
 */
function handleSystemPreferenceChange(state: ThemeState, preference: 'light' | 'dark'): ThemeState {
    // If variant is auto, we need to recalculate the resolved theme
    if (state.config.variant === 'auto') {
        return {
            ...state,
            resolved: {
                ...state.resolved,
                current: preference,
                systemPreference: preference
            }
        };
    }

    return {
        ...state,
        resolved: {
            ...state.resolved,
            systemPreference: preference
        }
    };
}

/**
 * Theme reducer
 */
export const themeReducer = createReducer(INITIAL_THEME_STATE, {
    // Theme variant actions
    [ThemeActionTypes.SET_THEME_VARIANT]: (state: ThemeState, action) => {
        const variant = (action as any).payload as ThemeVariant;
        return handleThemeVariantChange(state, variant);
    },

    [ThemeActionTypes.TOGGLE_THEME]: (state: ThemeState) => {
        const currentResolved = state.resolved.current;
        const newVariant = currentResolved === 'light' ? 'dark' : 'light';
        return handleThemeVariantChange(state, newVariant);
    },

    // Theme configuration actions
    [ThemeActionTypes.SET_THEME_CONFIG]: (state: ThemeState, action) => {
        const config = (action as any).payload as ThemeConfig;
        return {
            ...state,
            config,
            resolved: resolveTheme(config, state.resolved.systemPreference || 'light')
        };
    },

    [ThemeActionTypes.UPDATE_THEME_CONFIG]: (state: ThemeState, action) => {
        const updates = (action as any).payload as Partial<ThemeConfig>;
        return updateThemeConfig(state, updates);
    },

    // System preference actions
    [ThemeActionTypes.SYSTEM_PREFERENCE_CHANGED]: (state: ThemeState, action) => {
        const preference = (action as any).payload as 'light' | 'dark';
        return handleSystemPreferenceChange(state, preference);
    },

    // Accessibility actions
    [ThemeActionTypes.SET_REDUCED_MOTION]: (state: ThemeState, action) => {
        const enabled = (action as any).payload as boolean;
        return updateThemeConfig(state, { reducedMotion: enabled });
    },

    [ThemeActionTypes.SET_HIGH_CONTRAST]: (state: ThemeState, action) => {
        const enabled = (action as any).payload as boolean;
        return updateThemeConfig(state, { highContrast: enabled });
    },

    // Transition actions
    [ThemeActionTypes.START_THEME_TRANSITION]: (state: ThemeState) => {
        return {
            ...state,
            transitioning: true
        };
    },

    [ThemeActionTypes.END_THEME_TRANSITION]: (state: ThemeState) => {
        return {
            ...state,
            transitioning: false
        };
    },

    // Initialization actions
    [ThemeActionTypes.THEME_INITIALIZED]: (state: ThemeState, action) => {
        const initialized = (action as any).payload as boolean;
        return {
            ...state,
            initialized
        };
    },

    // Async action states
    'THEME_DETECT_SYSTEM_PREFERENCE_REQUEST': (state: ThemeState) => {
        return {
            ...state,
            initialized: false
        };
    },

    'THEME_DETECT_SYSTEM_PREFERENCE_SUCCESS': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_DETECT_SYSTEM_PREFERENCE_FAILURE': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_SAVE_CONFIG_REQUEST': (state: ThemeState) => {
        return {
            ...state,
            initialized: false
        };
    },

    'THEME_SAVE_CONFIG_SUCCESS': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_SAVE_CONFIG_FAILURE': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_LOAD_CONFIG_REQUEST': (state: ThemeState) => {
        return {
            ...state,
            initialized: false
        };
    },

    'THEME_LOAD_CONFIG_SUCCESS': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_LOAD_CONFIG_FAILURE': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_INITIALIZE_REQUEST': (state: ThemeState) => {
        return {
            ...state,
            initialized: false
        };
    },

    'THEME_INITIALIZE_SUCCESS': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    },

    'THEME_INITIALIZE_FAILURE': (state: ThemeState) => {
        return {
            ...state,
            initialized: true
        };
    }
});