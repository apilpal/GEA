import { Selector, ParametricSelector, MemoizedSelector, SelectorCache } from './types';

/**
 * Simple cache implementation for memoization
 */
class DefaultCache implements SelectorCache {
    private cache = new Map<string, any>();

    get(key: string): any {
        return this.cache.get(key);
    }

    set(key: string, value: any): void {
        this.cache.set(key, value);
    }

    clear(): void {
        this.cache.clear();
    }

    has(key: string): boolean {
        return this.cache.has(key);
    }
}

/**
 * Creates a memoized selector function
 */
export function createSelector<TState, TResult>(
    inputSelectors: Array<Selector<TState, any>>,
    resultFn: (...args: any[]) => TResult
): MemoizedSelector<TState, TResult> {
    const cache = new DefaultCache();

    const memoizedSelector = Object.assign(
        (state: TState): TResult => {
            const inputs = inputSelectors.map(selector => selector(state));
            const key = JSON.stringify(inputs);

            if (cache.has(key)) {
                return cache.get(key);
            }

            const result = resultFn(...inputs);
            cache.set(key, result);
            return result;
        },
        {
            clearCache(): void {
                cache.clear();
            },
            getCache(): SelectorCache {
                return cache;
            }
        }
    );

    return memoizedSelector as MemoizedSelector<TState, TResult>;
}

/**
 * Creates a parametric memoized selector
 */
export function createParametricSelector<TState, TProps, TResult>(
    inputSelectors: Array<Selector<TState, any>>,
    resultFn: (state: TState, props: TProps) => TResult
): ParametricSelector<TState, TProps, TResult> & {
    clearCache(): void;
    getCache(): SelectorCache;
} {
    const cache = new DefaultCache();

    const parametricSelector = Object.assign(
        (state: TState, props: TProps): TResult => {
            const inputs = inputSelectors.map(selector => selector(state));
            const key = JSON.stringify({ inputs, props });

            if (cache.has(key)) {
                return cache.get(key);
            }

            const result = resultFn(state, props);
            cache.set(key, result);
            return result;
        },
        {
            clearCache(): void {
                cache.clear();
            },
            getCache(): SelectorCache {
                return cache;
            }
        }
    );

    return parametricSelector;
}

/**
 * Creates a structured selector that returns an object with multiple computed values
 */
export function createStructuredSelector<TState, TResult extends Record<string, any>>(
    selectors: {
        [K in keyof TResult]: Selector<TState, TResult[K]>
    }
): Selector<TState, TResult> {
    const keys = Object.keys(selectors) as Array<keyof TResult>;
    const selectorArray = keys.map(key => selectors[key]);

    return createSelector(
        selectorArray,
        (...results: Array<TResult[keyof TResult]>) => {
            return keys.reduce((structuredResult, key, index) => {
                structuredResult[key] = results[index];
                return structuredResult;
            }, {} as TResult);
        }
    );
}

/**
 * Utility functions for working with selectors
 */
export const SelectorUtils = {
    /**
     * Combines multiple selectors into a single object selector
     */
    combine: <TState, TResult extends Record<string, any>>(
        selectors: {
            [K in keyof TResult]: Selector<TState, TResult[K]>
        }
    ): Selector<TState, TResult> => {
        return createStructuredSelector(selectors);
    },

    /**
     * Creates a selector that returns the first non-null value from a list of selectors
     */
    coalesce: <TState, TResult>(
        selectors: Array<Selector<TState, TResult | null | undefined>>
    ): Selector<TState, TResult | null> => {
        return createSelector(
            selectors,
            (...results: Array<TResult | null | undefined>): TResult | null => {
                for (const result of results) {
                    if (result != null) {
                        return result;
                    }
                }
                return null;
            }
        );
    },

    /**
     * Creates a selector that applies a transformation to the result of another selector
     */
    map: <TState, TInput, TResult>(
        selector: Selector<TState, TInput>,
        transformer: (input: TInput) => TResult
    ): Selector<TState, TResult> => {
        return createSelector([selector], transformer);
    },

    /**
     * Creates a selector that returns a default value if the original selector returns null/undefined
     */
    defaultTo: <TState, TResult>(
        selector: Selector<TState, TResult | null | undefined>,
        defaultValue: TResult
    ): Selector<TState, TResult> => {
        return createSelector(
            [selector],
            (result: TResult | null | undefined): TResult =>
                result != null ? result : defaultValue
        );
    }
};

/**
 * Common selector patterns for typical state structures
 */
export const CommonSelectors = {
    /**
     * Selects loading state from async state
     */
    isLoading: <TState>(loadingSelector: Selector<TState, boolean>): Selector<TState, boolean> =>
        loadingSelector,

    /**
     * Selects error state from async state
     */
    getError: <TState, TError>(errorSelector: Selector<TState, TError | null>): Selector<TState, TError | null> =>
        errorSelector,

    /**
     * Selects data from async state
     */
    getData: <TState, TData>(dataSelector: Selector<TState, TData | null>): Selector<TState, TData | null> =>
        dataSelector,

    /**
     * Selects whether async operation has error
     */
    hasError: <TState>(errorSelector: Selector<TState, any>): Selector<TState, boolean> =>
        createSelector([errorSelector], (error): boolean => error != null),

    /**
     * Selects whether async operation is successful (has data and no error)
     */
    isSuccess: <TState, TData>(
        dataSelector: Selector<TState, TData | null>,
        errorSelector: Selector<TState, any>
    ): Selector<TState, boolean> =>
        createSelector(
            [dataSelector, errorSelector],
            (data, error): boolean => data != null && error == null
        ),

    /**
     * Selects all entities from normalized state
     */
    getAllEntities: <TState, TEntity>(
        entitiesSelector: Selector<TState, Record<string, TEntity>>
    ): Selector<TState, TEntity[]> =>
        createSelector([entitiesSelector], (entities): TEntity[] =>
            Object.values(entities)
        ),

    /**
     * Selects a single entity by ID from normalized state
     */
    getEntityById: <TState, TEntity>(
        entitiesSelector: Selector<TState, Record<string, TEntity>>,
        idSelector: Selector<TState, string>
    ): Selector<TState, TEntity | undefined> =>
        createSelector(
            [entitiesSelector, idSelector],
            (entities, id): TEntity | undefined => entities[id]
        ),

    /**
     * Selects form values
     */
    getFormValues: <TState, TFormData>(
        formSelector: Selector<TState, { values: TFormData }>
    ): Selector<TState, TFormData> =>
        createSelector([formSelector], (form): TFormData => form.values),

    /**
     * Selects form errors
     */
    getFormErrors: <TState, TFormData>(
        formSelector: Selector<TState, { errors: Partial<Record<keyof TFormData, string>> }>
    ): Selector<TState, Partial<Record<keyof TFormData, string>>> =>
        createSelector([formSelector], (form) => form.errors),

    /**
     * Selects whether form is submitting
     */
    isFormSubmitting: <TState>(
        formSelector: Selector<TState, { submitting: boolean }>
    ): Selector<TState, boolean> =>
        createSelector([formSelector], (form): boolean => form.submitting)
};