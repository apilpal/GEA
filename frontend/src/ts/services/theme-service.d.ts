import { ThemeConfig } from '@/ts/store/theme/types';
export declare class ThemeService {
    private static instance;
    private storeProvider;
    private mediaQueryListeners;
    private themeChangeListeners;
    private constructor();
    static getInstance(): ThemeService;
    private initialize;
    private waitForStoreProvider;
    private setupSystemPreferenceDetection;
    private handleSystemPreferenceChange;
    private setupThemeChangeListeners;
    private setupKeyboardShortcuts;
    applyTheme(theme: 'light' | 'dark', transitionDuration?: number): Promise<void>;
    setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void>;
    toggleTheme(): Promise<void>;
    setReducedMotion(enabled: boolean): Promise<void>;
    setHighContrast(enabled: boolean): Promise<void>;
    getCurrentTheme(): 'light' | 'dark';
    getThemeConfig(): ThemeConfig | null;
    isReducedMotion(): boolean;
    isHighContrast(): boolean;
    onThemeChange(listener: (theme: 'light' | 'dark') => void): () => void;
    createThemePreview(theme: 'light' | 'dark'): string;
    private generatePreviewStyles;
    exportThemeConfig(): string;
    importThemeConfig(configJson: string): Promise<void>;
    resetToDefaults(): Promise<void>;
    destroy(): void;
}
export declare const themeService: ThemeService;
export declare const Theme: {
    getCurrent: () => "light" | "dark";
    set: (theme: "light" | "dark" | "auto") => Promise<void>;
    toggle: () => Promise<void>;
    setReducedMotion: (enabled: boolean) => Promise<void>;
    setHighContrast: (enabled: boolean) => Promise<void>;
    isReducedMotion: () => boolean;
    isHighContrast: () => boolean;
    onChange: (listener: (theme: "light" | "dark") => void) => () => void;
    createPreview: (theme: "light" | "dark") => string;
    exportConfig: () => string;
    importConfig: (config: string) => Promise<void>;
    reset: () => Promise<void>;
};
//# sourceMappingURL=theme-service.d.ts.map