import { Selector } from './types';
export declare const SelectorUtils: {
    combine: <TState, TResult extends Record<string, any>>(selectors: { [K in keyof TResult]: Selector<TState, TResult[K]>; }) => Selector<TState, TResult>;
    coalesce: <TState, TResult>(selectors: Array<Selector<TState, TResult | null | undefined>>) => Selector<TState, TResult | null>;
    map: <TState, TInput, TResult>(selector: Selector<TState, TInput>, transformer: (input: TInput) => TResult) => Selector<TState, TResult>;
    defaultTo: <TState, TResult>(selector: Selector<TState, TResult | null | undefined>, defaultValue: TResult) => Selector<TState, TResult>;
};
export declare const CommonSelectors: {
    isLoading: <TState>(loadingSelector: Selector<TState, boolean>) => Selector<TState, boolean>;
    getError: <TState, TError>(errorSelector: Selector<TState, TError | null>) => Selector<TState, TError | null>;
    getData: <TState, TData>(dataSelector: Selector<TState, TData | null>) => Selector<TState, TData | null>;
    hasError: <TState>(errorSelector: Selector<TState, any>) => Selector<TState, boolean>;
    isSuccess: <TState, TData>(dataSelector: Selector<TState, TData | null>, errorSelector: Selector<TState, any>) => Selector<TState, boolean>;
    getAllEntities: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>) => Selector<TState, TEntity[]>;
    getEntityById: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>, idSelector: Selector<TState, string>) => Selector<TState, TEntity | undefined>;
    getFormValues: <TState, TFormData>(formSelector: Selector<TState, {
        values: TFormData;
    }>) => Selector<TState, TFormData>;
    getFormErrors: <TState, TFormData>(formSelector: Selector<TState, {
        errors: Partial<Record<keyof TFormData, string>>;
    }>) => Selector<TState, Partial<Record<keyof TFormData, string>>>;
    isFormSubmitting: <TState>(formSelector: Selector<TState, {
        submitting: boolean;
    }>) => Selector<TState, boolean>;
};
export declare const SelectorUtils: {
    combine: <TState, TResult extends Record<string, any>>(selectors: { [K in keyof TResult]: Selector<TState, TResult[K]>; }) => Selector<TState, TResult>;
    coalesce: <TState, TResult>(selectors: Array<Selector<TState, TResult | null | undefined>>) => Selector<TState, TResult | null>;
    map: <TState, TInput, TResult>(selector: Selector<TState, TInput>, transformer: (input: TInput) => TResult) => Selector<TState, TResult>;
    defaultTo: <TState, TResult>(selector: Selector<TState, TResult | null | undefined>, defaultValue: TResult) => Selector<TState, TResult>;
};
export declare const CommonSelectors: {
    isLoading: <TState>(loadingSelector: Selector<TState, boolean>) => Selector<TState, boolean>;
    getError: <TState, TError>(errorSelector: Selector<TState, TError | null>) => Selector<TState, TError | null>;
    getData: <TState, TData>(dataSelector: Selector<TState, TData | null>) => Selector<TState, TData | null>;
    hasError: <TState>(errorSelector: Selector<TState, any>) => Selector<TState, boolean>;
    isSuccess: <TState, TData>(dataSelector: Selector<TState, TData | null>, errorSelector: Selector<TState, any>) => Selector<TState, boolean>;
    getAllEntities: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>) => Selector<TState, TEntity[]>;
    getEntityById: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>, idSelector: Selector<TState, string>) => Selector<TState, TEntity | undefined>;
    getFormValues: <TState, TFormData>(formSelector: Selector<TState, {
        values: TFormData;
    }>) => Selector<TState, TFormData>;
    getFormErrors: <TState, TFormData>(formSelector: Selector<TState, {
        errors: Partial<Record<keyof TFormData, string>>;
    }>) => Selector<TState, Partial<Record<keyof TFormData, string>>>;
    isFormSubmitting: <TState>(formSelector: Selector<TState, {
        submitting: boolean;
    }>) => Selector<TState, boolean>;
};
export declare function createFirstTrueSelector<TState, TResult>(selectors: Array<Selector<TState, TResult | null | undefined | false | 0 | ''>>): Selector<TState, TResult | null>;
export declare function createArraySelector<TState, TResult>(selectors: Array<Selector<TState, TResult>>): Selector<TState, TResult[]>;
export declare function createFilterSelector<TState, TItem>(arraySelector: Selector<TState, TItem[]>, predicateSelector: Selector<TState, (item: TItem) => boolean>): Selector<TState, TItem[]>;
export declare function createFindSelector<TState, TItem>(arraySelector: Selector<TState, TItem[]>, predicateSelector: Selector<TState, (item: TItem) => boolean>): Selector<TState, TItem | undefined>;
export declare function createSortSelector<TState, TItem>(arraySelector: Selector<TState, TItem[]>, compareSelector: Selector<TState, (a: TItem, b: TItem) => number>): Selector<TState, TItem[]>;
export declare function createGroupBySelector<TState, TItem, TKey extends string | number | symbol>(arraySelector: Selector<TState, TItem[]>, keySelector: Selector<TState, (item: TItem) => TKey>): Selector<TState, Record<TKey, TItem[]>>;
export declare function createCountSelector<TState, TItem>(arraySelector: Selector<TState, TItem[]>, predicateSelector: Selector<TState, (item: TItem) => boolean>): Selector<TState, number>;
export declare function createPaginationSelector<TState, TItem>(arraySelector: Selector<TState, TItem[]>, pageSelector: Selector<TState, number>, pageSizeSelector: Selector<TState, number>): Selector<TState, {
    items: TItem[];
    total: number;
    page: number;
    totalPages: number;
}>;
export declare function createDebouncedSelector<TState, TResult>(selector: Selector<TState, TResult>, delay: number): Selector<TState, TResult> & {
    flush(): TResult | undefined;
};
export declare const SelectorUtils: {
    combine: <TState, TResult extends Record<string, any>>(selectors: { [K in keyof TResult]: Selector<TState, TResult[K]>; }) => Selector<TState, TResult>;
    coalesce: <TState, TResult>(selectors: Array<Selector<TState, TResult | null | undefined>>) => Selector<TState, TResult | null>;
    map: <TState, TInput, TResult>(selector: Selector<TState, TInput>, transformer: (input: TInput) => TResult) => Selector<TState, TResult>;
    filter: <TState, TItem>(selector: Selector<TState, TItem[]>, predicate: (item: TItem) => boolean) => Selector<TState, TItem[]>;
    defaultTo: <TState, TResult>(selector: Selector<TState, TResult | null | undefined>, defaultValue: TResult) => Selector<TState, TResult>;
    memoize: <TState, TResult>(selector: Selector<TState, TResult>, isEqual?: (a: TResult, b: TResult) => boolean) => Selector<TState, TResult>;
};
export declare const CommonSelectors: {
    isLoading: <TState>(loadingSelector: Selector<TState, boolean>) => Selector<TState, boolean>;
    getError: <TState, TError>(errorSelector: Selector<TState, TError | null>) => Selector<TState, TError | null>;
    getData: <TState, TData>(dataSelector: Selector<TState, TData | null>) => Selector<TState, TData | null>;
    hasError: <TState>(errorSelector: Selector<TState, any>) => Selector<TState, boolean>;
    isSuccess: <TState, TData>(dataSelector: Selector<TState, TData | null>, errorSelector: Selector<TState, any>) => Selector<TState, boolean>;
    getAllEntities: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>) => Selector<TState, TEntity[]>;
    getEntitiesByIds: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>, idsSelector: Selector<TState, string[]>) => Selector<TState, TEntity[]>;
    getEntityById: <TState, TEntity>(entitiesSelector: Selector<TState, Record<string, TEntity>>, idSelector: Selector<TState, string>) => Selector<TState, TEntity | undefined>;
    getFormValues: <TState, TFormData>(formSelector: Selector<TState, {
        values: TFormData;
    }>) => Selector<TState, TFormData>;
    getFormErrors: <TState, TFormData>(formSelector: Selector<TState, {
        errors: Partial<Record<keyof TFormData, string>>;
    }>) => Selector<TState, Partial<Record<keyof TFormData, string>>>;
    isFormSubmitting: <TState>(formSelector: Selector<TState, {
        submitting: boolean;
    }>) => Selector<TState, boolean>;
};
export declare const SelectorDevTools: {
    withLogging: <TState, TResult>(selector: Selector<TState, TResult>, name?: string) => Selector<TState, TResult>;
    measurePerformance: <TState, TResult>(selector: Selector<TState, TResult>, iterations?: number) => number;
};
//# sourceMappingURL=selectors.d.ts.map