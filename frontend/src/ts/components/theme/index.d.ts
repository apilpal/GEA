export * from './theme-toggle-component';
export * from './theme-store-provider';
export * from '@/ts/store/theme';
import { ThemeToggleComponent } from './theme-toggle-component';
import { ThemeStoreProvider } from './theme-store-provider';
export declare const ThemeComponents: {
    ThemeToggle: typeof ThemeToggleComponent;
    ThemeStoreProvider: typeof ThemeStoreProvider;
};
export declare function initializeThemeSystem(): Promise<void>;
export declare const ThemeUtils: {
    getCurrentTheme(): "light" | "dark";
    isHighContrast(): boolean;
    isReducedMotion(): boolean;
    applyThemeToElement(element: HTMLElement, theme: "light" | "dark" | "high-contrast"): void;
    removeThemeFromElement(element: HTMLElement): void;
};
//# sourceMappingURL=index.d.ts.map