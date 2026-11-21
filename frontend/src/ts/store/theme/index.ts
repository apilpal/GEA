// Theme store module - comprehensive theming system
export * from './types';
export * from './actions';
export * from './reducer';
export * from './selectors';
export * from './thunks';

// Theme store factory function
import { createStore } from '@/ts/store/core/store';
import { themeReducer } from './reducer';
import { INITIAL_THEME_STATE } from './types';

/**
 * Creates a theme store instance
 */
export function createThemeStore() {
    return createStore(themeReducer, INITIAL_THEME_STATE, {
        devTools: true,
        middleware: [
            // Add logger in development
            process.env.NODE_ENV === 'development'
                ? require('../middleware/logger').logger
                : undefined
        ].filter(Boolean)
    });
}

/**
 * Complete theme store with all functionality
 */
export const ThemeStore = {
    actions: require('./actions').ThemeActions,
    thunks: require('./thunks').ThemeThunks,
    selectors: require('./selectors').ThemeSelectors,
    reducer: themeReducer,
    createStore: createThemeStore,
    types: require('./types')
};