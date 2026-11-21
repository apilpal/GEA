import { createThemeStore } from '@/ts/store/theme';
import { StoreProvider } from '@/ts/store/components/store-provider';
export interface ThemeStoreProviderProps {
    children?: HTMLElement | HTMLElement[];
    enableDevTools?: boolean;
    persistToStorage?: boolean;
}
export declare class ThemeStoreProvider extends StoreProvider {
    private themeStore;
    private initialized;
    constructor(props?: ThemeStoreProviderProps);
    private initializeTheme;
    private applyThemeToDocument;
    private subscribeToThemeChanges;
    getThemeStore(): ReturnType<typeof createThemeStore>;
    getCurrentTheme(): 'light' | 'dark';
    getThemeConfig(): any;
    toggleTheme(): Promise<void>;
    setThemeVariant(variant: 'light' | 'dark' | 'auto'): Promise<void>;
    setReducedMotion(enabled: boolean): Promise<void>;
    setHighContrast(enabled: boolean): Promise<void>;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=theme-store-provider.d.ts.map