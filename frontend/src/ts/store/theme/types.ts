// Theme store types and interfaces

/**
 * Theme variant options
 */
export type ThemeVariant = 'light' | 'dark' | 'auto';

/**
 * System preference for color scheme
 */
export type SystemPreference = 'light' | 'dark';

/**
 * Theme configuration interface
 */
export interface ThemeConfig {
    variant: ThemeVariant;
    systemPreference: SystemPreference;
    reducedMotion: boolean;
    highContrast: boolean;
    transitionDuration: number;
}

/**
 * Resolved theme state (computed based on variant and system preference)
 */
export interface ResolvedTheme {
    current: 'light' | 'dark';
    variant: ThemeVariant;
    systemPreference: SystemPreference | null;
}

/**
 * Theme state interface
 */
export interface ThemeState {
    config: ThemeConfig;
    resolved: ResolvedTheme;
    initialized: boolean;
    transitioning: boolean;
}

/**
 * Theme CSS custom properties structure
 */
export interface ThemeCSSProperties {
    // Color properties
    '--color-primary': string;
    '--color-secondary': string;
    '--color-accent': string;
    '--color-success': string;
    '--color-warning': string;
    '--color-danger': string;
    '--color-info': string;

    // Background properties
    '--color-background': string;
    '--color-card-background': string;
    '--color-surface': string;
    '--color-surface-elevated': string;

    // Text properties
    '--color-text': string;
    '--color-text-muted': string;
    '--color-text-inverse': string;

    // Border properties
    '--color-border': string;
    '--color-border-light': string;
    '--color-border-focus': string;

    // Shadow properties
    '--shadow-sm': string;
    '--shadow-md': string;
    '--shadow-lg': string;
    '--shadow-xl': string;

    // Spacing and sizing
    '--border-radius-sm': string;
    '--border-radius-md': string;
    '--border-radius-lg': string;

    // Animation properties
    '--transition-fast': string;
    '--transition-base': string;
    '--transition-slow': string;

    // Focus properties
    '--focus-ring-width': string;
    '--focus-ring-color': string;
}

/**
 * Complete theme definition
 */
export interface ThemeDefinition {
    name: string;
    properties: ThemeCSSProperties;
}

/**
 * Theme transition options
 */
export interface ThemeTransitionOptions {
    duration?: number;
    easing?: string;
    properties?: string[];
}

/**
 * Theme storage keys
 */
export const THEME_STORAGE_KEYS = {
    CONFIG: 'theme-config',
    PREFERENCES: 'theme-preferences'
} as const;

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
    variant: 'auto',
    systemPreference: 'light',
    reducedMotion: false,
    highContrast: false,
    transitionDuration: 300
};

/**
 * Initial theme state
 */
export const INITIAL_THEME_STATE: ThemeState = {
    config: DEFAULT_THEME_CONFIG,
    resolved: {
        current: 'light',
        variant: 'auto',
        systemPreference: null
    },
    initialized: false,
    transitioning: false
};