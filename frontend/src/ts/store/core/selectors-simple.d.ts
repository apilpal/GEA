import { Selector, ParametricSelector, MemoizedSelector, SelectorCache } from './types';
export declare function createSelector<TState, TResult>(inputSelectors: Array<Selector<TState, any>>, resultFn: (...args: any[]) => TResult): MemoizedSelector<TState, TResult>;
export declare function createParametricSelector<TState, TProps, TResult>(inputSelectors: Array<Selector<TState, any>>, resultFn: (state: TState, props: TProps) => TResult): ParametricSelector<TState, TProps, TResult> & {
    clearCache(): void;
    getCache(): SelectorCache;
};
export declare function createStructuredSelector<TState, TResult extends Record<string, any>>(selectors: {
    [K in keyof TResult]: Selector<TState, TResult[K]>;
}): Selector<TState, TResult>;
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
//# sourceMappingURL=selectors-simple.d.ts.map