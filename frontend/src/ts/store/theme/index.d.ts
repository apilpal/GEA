export * from './types';
export * from './actions';
export * from './reducer';
export * from './selectors';
export * from './thunks';
export declare function createThemeStore(): import("@/ts/store/core/store").ReduxStore<import("./types").ThemeState, import("../core").BaseAction<string, any>>;
export declare const ThemeStore: {
    actions: any;
    thunks: any;
    selectors: any;
    reducer: import("../core").Reducer<import("./types").ThemeState, import("../core").BaseAction<string, any>>;
    createStore: typeof createThemeStore;
    types: any;
};
//# sourceMappingURL=index.d.ts.map