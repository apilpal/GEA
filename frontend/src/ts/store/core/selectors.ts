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
 * Creates a memoized selector function with proper typing
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
    resultFn: (state: TState, props: TProps) => TResult,
    cacheFactory?: () => SelectorCache
): ParametricSelector<TState, TProps, TResult> & {
    clearCache(): void;
    getCache(): SelectorCache;
} {
    const cache = cacheFactory ? cacheFactory() : new DefaultCache();

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
 * Creates a memoized selector function with proper typing
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
    resultFn: (state: TState, props: TProps) => TResult,
    cacheFactory?: () => SelectorCache
): ParametricSelector<TState, TProps, TResult> & {
    clearCache(): void;
    getCache(): SelectorCache;
} {
    const cache = cacheFactory ? cacheFactory() : new DefaultCache();

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
 * Simple selector utilities
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

/**
 * Creates a parametric memoized selector
 */
export function createParametricSelector<TState, TProps, TResult>(
    inputSelectors: Array<Selector<TState, any>>,
    resultFn: (state: TState, props: TProps) => TResult,
    cacheFactory?: () => SelectorCache
): ParametricSelector<TState, TProps, TResult> & {
    clearCache(): void;
    getCache(): SelectorCache;
} {
    const cache = cacheFactory ? cacheFactory() : new DefaultCache();

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

    return createSelector(
        ...keys.map(key => selectors[key]),
        (...results: Array<TResult[keyof TResult]>) => {
            return keys.reduce((structuredResult, key, index) => {
                structuredResult[key] = results[index];
                return structuredResult;
            }, {} as TResult);
        }
    );
}

/**
 * Creates a selector that returns the result of the first selector that returns a truthy value
 */
export function createFirstTrueSelector<TState, TResult>(
    selectors: Array<Selector<TState, TResult | null | undefined | false | 0 | ''>>
): Selector<TState, TResult | null> {
    return createSelector(
        ...selectors,
        (...results: Array<TResult | null | undefined | false | 0 | ''>): TResult | null => {
            for (const result of results) {
                if (result) {
                    return result;
                }
            }
            return null;
        }
    );
}

/**
 * Creates a selector that returns an array of results from multiple selectors
 */
export function createArraySelector<TState, TResult>(
    selectors: Array<Selector<TState, TResult>>
): Selector<TState, TResult[]> {
    return createSelector(
        ...selectors,
        (...results: TResult[]): TResult[] => results
    );
}

/**
 * Creates a selector that filters an array based on a predicate
 */
export function createFilterSelector<TState, TItem>(
    arraySelector: Selector<TState, TItem[]>,
    predicateSelector: Selector<TState, (item: TItem) => boolean>
): Selector<TState, TItem[]> {
    return createSelector(
        arraySelector,
        predicateSelector,
        (array, predicate): TItem[] => array.filter(predicate)
    );
}

/**
 * Creates a selector that finds an item in an array
 */
export function createFindSelector<TState, TItem>(
    arraySelector: Selector<TState, TItem[]>,
    predicateSelector: Selector<TState, (item: TItem) => boolean>
): Selector<TState, TItem | undefined> {
    return createSelector(
        arraySelector,
        predicateSelector,
        (array, predicate): TItem | undefined => array.find(predicate)
    );
}

/**
 * Creates a selector that sorts an array
 */
export function createSortSelector<TState, TItem>(
    arraySelector: Selector<TState, TItem[]>,
    compareSelector: Selector<TState, (a: TItem, b: TItem) => number>
): Selector<TState, TItem[]> {
    return createSelector(
        arraySelector,
        compareSelector,
        (array, compare): TItem[] => [...array].sort(compare)
    );
}

/**
 * Creates a selector that groups items by a key function
 */
export function createGroupBySelector<TState, TItem, TKey extends string | number | symbol>(
    arraySelector: Selector<TState, TItem[]>,
    keySelector: Selector<TState, (item: TItem) => TKey>
): Selector<TState, Record<TKey, TItem[]>> {
    return createSelector(
        arraySelector,
        keySelector,
        (array, getKey): Record<TKey, TItem[]> => {
            return array.reduce((groups, item) => {
                const key = getKey(item);
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(item);
                return groups;
            }, {} as Record<TKey, TItem[]>);
        }
    );
}

/**
 * Creates a selector that counts items matching a predicate
 */
export function createCountSelector<TState, TItem>(
    arraySelector: Selector<TState, TItem[]>,
    predicateSelector: Selector<TState, (item: TItem) => boolean>
): Selector<TState, number> {
    return createSelector(
        arraySelector,
        predicateSelector,
        (array, predicate): number => array.filter(predicate).length
    );
}

/**
 * Creates a selector that returns a paginated subset of an array
 */
export function createPaginationSelector<TState, TItem>(
    arraySelector: Selector<TState, TItem[]>,
    pageSelector: Selector<TState, number>,
    pageSizeSelector: Selector<TState, number>
): Selector<TState, { items: TItem[]; total: number; page: number; totalPages: number }> {
    return createSelector(
        arraySelector,
        pageSelector,
        pageSizeSelector,
        (array, page, pageSize) => {
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const items = array.slice(startIndex, endIndex);
            const total = array.length;
            const totalPages = Math.ceil(total / pageSize);

            return { items, total, page, totalPages };
        }
    );
}

/**
 * Creates a selector that debounces another selector (useful for expensive computations)
 */
export function createDebouncedSelector<TState, TResult>(
    selector: Selector<TState, TResult>,
    delay: number
): Selector<TState, TResult> & { flush(): TResult | undefined } {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastResult: TResult | undefined;
    let lastArgs: TState | undefined;

    return Object.assign(
        (state: TState): TResult => {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                lastResult = selector(state);
                timeoutId = null;
            }, delay);

            if (lastArgs !== state) {
                lastResult = selector(state);
                lastArgs = state;
            }

            return lastResult as TResult;
        },
        {
            flush(): TResult | undefined {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                    if (lastArgs !== undefined) {
                        lastResult = selector(lastArgs);
                    }
                }
                return lastResult;
            }
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
            ...selectors,
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
        return createSelector(selector, transformer);
    },

    /**
     * Creates a selector that filters the result of another selector
     */
    filter: <TState, TItem>(
        selector: Selector<TState, TItem[]>,
        predicate: (item: TItem) => boolean
    ): Selector<TState, TItem[]> => {
        return createSelector(selector, (items: TItem[]): TItem[] =>
            items.filter(predicate)
        );
    },

    /**
     * Creates a selector that returns a default value if the original selector returns null/undefined
     */
    defaultTo: <TState, TResult>(
        selector: Selector<TState, TResult | null | undefined>,
        defaultValue: TResult
    ): Selector<TState, TResult> => {
        return createSelector(
            selector,
            (result: TResult | null | undefined): TResult =>
                result != null ? result : defaultValue
        );
    },

    /**
     * Creates a selector that only recomputes when dependencies change
     */
    memoize: <TState, TResult>(
        selector: Selector<TState, TResult>,
        isEqual?: (a: TResult, b: TResult) => boolean
    ): Selector<TState, TResult> => {
        let lastResult: TResult | undefined;
        let lastArgs: TState | undefined;

        return (state: TState): TResult => {
            if (lastArgs === state && lastResult !== undefined) {
                return lastResult;
            }

            const result = selector(state);

            if (lastResult !== undefined && isEqual && isEqual(lastResult, result)) {
                return lastResult;
            }

            lastResult = result;
            lastArgs = state;
            return result;
        };
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
        createSelector(errorSelector, (error): boolean => error != null),

    /**
     * Selects whether async operation is successful (has data and no error)
     */
    isSuccess: <TState, TData>(
        dataSelector: Selector<TState, TData | null>,
        errorSelector: Selector<TState, any>
    ): Selector<TState, boolean> =>
        createSelector(
            dataSelector,
            errorSelector,
            (data, error): boolean => data != null && error == null
        ),

    /**
     * Selects all entities from normalized state
     */
    getAllEntities: <TState, TEntity>(
        entitiesSelector: Selector<TState, Record<string, TEntity>>
    ): Selector<TState, TEntity[]> =>
        createSelector(entitiesSelector, (entities): TEntity[] =>
            Object.values(entities)
        ),

    /**
     * Selects entities by IDs from normalized state
     */
    getEntitiesByIds: <TState, TEntity>(
        entitiesSelector: Selector<TState, Record<string, TEntity>>,
        idsSelector: Selector<TState, string[]>
    ): Selector<TState, TEntity[]> =>
        createSelector(
            entitiesSelector,
            idsSelector,
            (entities, ids): TEntity[] =>
                ids.map(id => entities[id]).filter(Boolean)
        ),

    /**
     * Selects a single entity by ID from normalized state
     */
    getEntityById: <TState, TEntity>(
        entitiesSelector: Selector<TState, Record<string, TEntity>>,
        idSelector: Selector<TState, string>
    ): Selector<TState, TEntity | undefined> =>
        createSelector(
            entitiesSelector,
            idSelector,
            (entities, id): TEntity | undefined => entities[id]
        ),

    /**
     * Selects form values
     */
    getFormValues: <TState, TFormData>(
        formSelector: Selector<TState, { values: TFormData }>
    ): Selector<TState, TFormData> =>
        createSelector(formSelector, (form): TFormData => form.values),

    /**
     * Selects form errors
     */
    getFormErrors: <TState, TFormData>(
        formSelector: Selector<TState, { errors: Partial<Record<keyof TFormData, string>> }>
    ): Selector<TState, Partial<Record<keyof TFormData, string>>> =>
        createSelector(formSelector, (form) => form.errors),

    /**
     * Selects whether form is submitting
     */
    isFormSubmitting: <TState>(
        formSelector: Selector<TState, { submitting: boolean }>
    ): Selector<TState, boolean> =>
        createSelector(formSelector, (form): boolean => form.submitting)
};

/**
 * Development utilities for selectors
 */
export const SelectorDevTools = {
    /**
     * Logs selector calls in development
     */
    withLogging: <TState, TResult>(
        selector: Selector<TState, TResult>,
        name?: string
    ): Selector<TState, TResult> => {
        return (state: TState): TResult => {
            if (process.env.NODE_ENV === 'development') {
                const start = performance.now();
                const result = selector(state);
                const end = performance.now();
                console.log(`Selector ${name || 'unnamed'}: ${end - start}ms`);
                return result;
            }
            return selector(state);
        };
    },

    /**
     * Measures selector performance
     */
    measurePerformance: <TState, TResult>(
        selector: Selector<TState, TResult>,
        iterations: number = 1000
    ): number => {
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            selector({} as TState);
        }

        const end = performance.now();
        return (end - start) / iterations;
    }
};