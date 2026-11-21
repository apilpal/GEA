import { ThemeConfig, ThemeVariant } from './types';
export declare const ThemeThunks: {
    initializeTheme: () => (dispatch: any) => Promise<void>;
    detectSystemPreference: () => (dispatch: any) => Promise<void>;
    loadThemeConfig: () => (dispatch: any) => Promise<void>;
    saveThemeConfig: () => (dispatch: any, getState: any) => Promise<void>;
    setThemeVariant: (variant: ThemeVariant) => (dispatch: any) => Promise<void>;
    toggleTheme: () => (dispatch: any, getState: any) => Promise<void>;
    updateThemeConfig: (updates: Partial<ThemeConfig>) => (dispatch: any) => Promise<void>;
    setReducedMotion: (enabled: boolean) => (dispatch: any) => Promise<void>;
    setHighContrast: (enabled: boolean) => (dispatch: any) => Promise<void>;
    applyThemeWithTransition: (variant: ThemeVariant, transitionDuration?: number) => (dispatch: any) => Promise<void>;
    resetTheme: () => (dispatch: any) => Promise<void>;
};
//# sourceMappingURL=thunks.d.ts.map