import { ThemeVariant, ThemeConfig, ThemeTransitionOptions } from './types';
export declare const ThemeActionTypes: {
    readonly SET_THEME_VARIANT: "THEME_SET_VARIANT";
    readonly TOGGLE_THEME: "THEME_TOGGLE";
    readonly SET_THEME_CONFIG: "THEME_SET_CONFIG";
    readonly UPDATE_THEME_CONFIG: "THEME_UPDATE_CONFIG";
    readonly DETECT_SYSTEM_PREFERENCE: "THEME_DETECT_SYSTEM_PREFERENCE";
    readonly SYSTEM_PREFERENCE_CHANGED: "THEME_SYSTEM_PREFERENCE_CHANGED";
    readonly SET_REDUCED_MOTION: "THEME_SET_REDUCED_MOTION";
    readonly SET_HIGH_CONTRAST: "THEME_SET_HIGH_CONTRAST";
    readonly START_THEME_TRANSITION: "THEME_START_TRANSITION";
    readonly END_THEME_TRANSITION: "THEME_END_TRANSITION";
    readonly SAVE_THEME_CONFIG: "THEME_SAVE_CONFIG";
    readonly LOAD_THEME_CONFIG: "THEME_LOAD_CONFIG";
    readonly INITIALIZE_THEME: "THEME_INITIALIZE";
    readonly THEME_INITIALIZED: "THEME_INITIALIZED";
};
export declare const ThemeActions: {
    setThemeVariant: (variant: ThemeVariant) => import("../core").BaseAction<"THEME_SET_VARIANT", any>;
    toggleTheme: () => import("../core").BaseAction<"THEME_TOGGLE", any>;
    setThemeConfig: (config: ThemeConfig) => import("../core").BaseAction<"THEME_SET_CONFIG", any>;
    updateThemeConfig: (updates: Partial<ThemeConfig>) => import("../core").BaseAction<"THEME_UPDATE_CONFIG", any>;
    detectSystemPreference: {
        request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
        success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        cancel: import("../core").ActionCreator<import("../core").BaseAction<"THEME_DETECT_SYSTEM_PREFERENCE", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"THEME_DETECT_SYSTEM_PREFERENCE", any>>;
    };
    systemPreferenceChanged: (preference: "light" | "dark") => import("../core").BaseAction<"THEME_SYSTEM_PREFERENCE_CHANGED", any>;
    setReducedMotion: (enabled: boolean) => import("../core").BaseAction<"THEME_SET_REDUCED_MOTION", any>;
    setHighContrast: (enabled: boolean) => import("../core").BaseAction<"THEME_SET_HIGH_CONTRAST", any>;
    startThemeTransition: (options?: ThemeTransitionOptions) => import("../core").BaseAction<"THEME_START_TRANSITION", any>;
    endThemeTransition: () => import("../core").BaseAction<"THEME_END_TRANSITION", any>;
    saveThemeConfig: {
        request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
        success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        cancel: import("../core").ActionCreator<import("../core").BaseAction<"THEME_SAVE_CONFIG", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"THEME_SAVE_CONFIG", any>>;
    };
    loadThemeConfig: {
        request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
        success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        cancel: import("../core").ActionCreator<import("../core").BaseAction<"THEME_LOAD_CONFIG", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"THEME_LOAD_CONFIG", any>>;
    };
    initializeTheme: {
        request: import("../core").ActionCreator<import("../core").BaseAction<string, undefined>>;
        success: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        failure: import("../core").ActionCreator<import("../core").BaseAction<string, any>>;
        cancel: import("../core").ActionCreator<import("../core").BaseAction<"THEME_INITIALIZE", any>>;
        reset: import("../core").ActionCreator<import("../core").BaseAction<"THEME_INITIALIZE", any>>;
    };
    themeInitialized: (initialized: boolean) => import("../core").BaseAction<"THEME_INITIALIZED", any>;
};
export declare const ThemeActionGuards: {
    isSetThemeVariant: (action: any) => action is ReturnType<typeof ThemeActions.setThemeVariant>;
    isToggleTheme: (action: any) => action is ReturnType<typeof ThemeActions.toggleTheme>;
    isSetThemeConfig: (action: any) => action is ReturnType<typeof ThemeActions.setThemeConfig>;
    isUpdateThemeConfig: (action: any) => action is ReturnType<typeof ThemeActions.updateThemeConfig>;
    isSystemPreferenceChanged: (action: any) => action is ReturnType<typeof ThemeActions.systemPreferenceChanged>;
    isSetReducedMotion: (action: any) => action is ReturnType<typeof ThemeActions.setReducedMotion>;
    isSetHighContrast: (action: any) => action is ReturnType<typeof ThemeActions.setHighContrast>;
    isStartThemeTransition: (action: any) => action is ReturnType<typeof ThemeActions.startThemeTransition>;
    isEndThemeTransition: (action: any) => action is ReturnType<typeof ThemeActions.endThemeTransition>;
    isThemeInitialized: (action: any) => action is ReturnType<typeof ThemeActions.themeInitialized>;
};
//# sourceMappingURL=actions.d.ts.map