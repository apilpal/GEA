export type ThemeVariant = 'light' | 'dark' | 'auto';
export type SystemPreference = 'light' | 'dark';
export interface ThemeConfig {
    variant: ThemeVariant;
    systemPreference: SystemPreference;
    reducedMotion: boolean;
    highContrast: boolean;
    transitionDuration: number;
}
export interface ResolvedTheme {
    current: 'light' | 'dark';
    variant: ThemeVariant;
    systemPreference: SystemPreference | null;
}
export interface ThemeState {
    config: ThemeConfig;
    resolved: ResolvedTheme;
    initialized: boolean;
    transitioning: boolean;
}
export interface ThemeCSSProperties {
    '--color-primary': string;
    '--color-secondary': string;
    '--color-accent': string;
    '--color-success': string;
    '--color-warning': string;
    '--color-danger': string;
    '--color-info': string;
    '--color-background': string;
    '--color-card-background': string;
    '--color-surface': string;
    '--color-surface-elevated': string;
    '--color-text': string;
    '--color-text-muted': string;
    '--color-text-inverse': string;
    '--color-border': string;
    '--color-border-light': string;
    '--color-border-focus': string;
    '--shadow-sm': string;
    '--shadow-md': string;
    '--shadow-lg': string;
    '--shadow-xl': string;
    '--border-radius-sm': string;
    '--border-radius-md': string;
    '--border-radius-lg': string;
    '--transition-fast': string;
    '--transition-base': string;
    '--transition-slow': string;
    '--focus-ring-width': string;
    '--focus-ring-color': string;
}
export interface ThemeDefinition {
    name: string;
    properties: ThemeCSSProperties;
}
export interface ThemeTransitionOptions {
    duration?: number;
    easing?: string;
    properties?: string[];
}
export declare const THEME_STORAGE_KEYS: {
    readonly CONFIG: "theme-config";
    readonly PREFERENCES: "theme-preferences";
};
export declare const DEFAULT_THEME_CONFIG: ThemeConfig;
export declare const INITIAL_THEME_STATE: ThemeState;
//# sourceMappingURL=types.d.ts.map