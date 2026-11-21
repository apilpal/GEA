import { ThemeState, ThemeVariant } from './types';
export declare const selectThemeState: (state: {
    theme: ThemeState;
}) => ThemeState;
export declare const selectThemeConfig: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectThemeVariant: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectSystemPreference: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectReducedMotion: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectHighContrast: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectTransitionDuration: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectResolvedTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectCurrentTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectIsLightTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, boolean>;
export declare const selectIsDarkTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, boolean>;
export declare const selectIsAutoTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, boolean>;
export declare const selectIsInitialized: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectIsTransitioning: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectIsLoading: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, boolean>;
export declare const selectEffectiveTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectThemeClassName: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, string>;
export declare const selectTransitionClassName: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, "" | "theme-transitioning">;
export declare const selectThemeCSSClasses: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, string>;
export declare const selectShouldReduceMotion: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectIsHighContrast: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, any>;
export declare const selectThemeConfigForStorage: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, {
    variant: any;
    reducedMotion: any;
    highContrast: any;
    transitionDuration: any;
}>;
export declare const selectOppositeTheme: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, "light" | "dark">;
export declare const selectAvailableThemeOptions: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, {
    value: ThemeVariant;
    label: string;
}[]>;
export declare const selectThemeDisplayInfo: import("../core").MemoizedSelector<{
    theme: ThemeState;
}, {
    current: any;
    variant: any;
    systemPreference: any;
    isTransitioning: any;
    isInitialized: any;
}>;
export declare const ThemeSelectors: {
    selectThemeConfig: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectThemeVariant: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectSystemPreference: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectReducedMotion: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectHighContrast: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectTransitionDuration: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectResolvedTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectCurrentTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectIsLightTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, boolean>;
    selectIsDarkTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, boolean>;
    selectIsAutoTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, boolean>;
    selectIsInitialized: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectIsTransitioning: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectIsLoading: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, boolean>;
    selectEffectiveTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectThemeClassName: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, string>;
    selectTransitionClassName: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, "" | "theme-transitioning">;
    selectThemeCSSClasses: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, string>;
    selectShouldReduceMotion: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectIsHighContrast: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, any>;
    selectThemeConfigForStorage: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, {
        variant: any;
        reducedMotion: any;
        highContrast: any;
        transitionDuration: any;
    }>;
    selectOppositeTheme: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, "light" | "dark">;
    selectAvailableThemeOptions: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, {
        value: ThemeVariant;
        label: string;
    }[]>;
    selectThemeDisplayInfo: import("../core").MemoizedSelector<{
        theme: ThemeState;
    }, {
        current: any;
        variant: any;
        systemPreference: any;
        isTransitioning: any;
        isInitialized: any;
    }>;
    selectState: (state: {
        theme: ThemeState;
    }) => ThemeState;
};
//# sourceMappingURL=selectors.d.ts.map