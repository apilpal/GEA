import { Store, BaseAction, Selector, Dispatch } from '@/ts/types/store';
export declare function useStore<TState = any>(store: Store<TState, BaseAction>): {
    state: TState;
    dispatch: Dispatch<BaseAction>;
};
export declare function useSelector<TState = any, TSelected = any>(store: Store<TState, BaseAction>, selector: Selector<TState, TSelected>): TSelected;
export declare function useDispatch<TState = any, TAction extends BaseAction = BaseAction>(store: Store<TState, TAction>): Dispatch<TAction>;
export declare function useCombinedSelectors<TResult extends Record<string, any>, TState = any>(store: Store<TState, BaseAction>, selectors: {
    [K in keyof TResult]: Selector<TState, TResult[K]>;
}): TResult;
export declare function useFeatureStore<TState = any, TActions extends Record<string, any> = any>(store: Store<TState, BaseAction>, featureSelectors: {
    [K in keyof TState]?: Selector<TState, TState[K]>;
}, actions: TActions): {
    state: {
        [K in keyof TState]?: TState[K];
    };
    actions: TActions;
    dispatch: Dispatch<BaseAction>;
};
export declare function useAsyncOperation<TState = any, TArgs extends any[] = any[], TResponse = any>(store: Store<TState, BaseAction>, asyncFn: (...args: TArgs) => Promise<TResponse>, deps: TArgs): {
    execute: (...args: TArgs) => Promise<TResponse>;
    loading: boolean;
    error: Error | null;
    data: TResponse | null;
};
export declare function useFormStore<TFormData = any, TState = any>(store: Store<TState, BaseAction>, formSelectors: {
    values: Selector<TState, TFormData>;
    errors: Selector<TState, Partial<Record<keyof TFormData, string>>>;
    submitting: Selector<TState, boolean>;
}, formActions: {
    setValue: (field: keyof TFormData, value: any) => BaseAction;
    setError: (field: keyof TFormData, error: string) => BaseAction;
    clearForm: () => BaseAction;
    submitForm: () => BaseAction;
}): {
    values: TFormData;
    errors: Partial<Record<keyof TFormData, string>>;
    submitting: boolean;
    setValue: (field: keyof TFormData, value: any) => void;
    setError: (field: keyof TFormData, error: string) => void;
    clearForm: () => void;
    submitForm: () => void;
    isValid: boolean;
};
export declare function useLocalStore<TState = any, TAction extends BaseAction = BaseAction>(store: Store<TState, TAction>, localSelectors: {
    [K in keyof TState]?: Selector<TState, TState[K]>;
}): {
    localState: {
        [K in keyof TState]?: TState[K];
    };
    syncWithStore: () => void;
    dispatch: Dispatch<TAction>;
};
export declare function usePagination<TState = any, TItem = any>(store: Store<TState, BaseAction>, selectors: {
    items: Selector<TState, TItem[]>;
    page: Selector<TState, number>;
    pageSize: Selector<TState, number>;
    total: Selector<TState, number>;
    loading: Selector<TState, boolean>;
}, actions: {
    setPage: (page: number) => BaseAction;
    fetchPage: (page: number) => BaseAction;
}): {
    items: TItem[];
    page: number;
    pageSize: number;
    total: number;
    loading: boolean;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    setPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    fetchPage: (page: number) => void;
};
export declare function useFilteredData<TState = any, TItem = any>(store: Store<TState, BaseAction>, selectors: {
    data: Selector<TState, TItem[]>;
    filter: Selector<TState, string>;
    sortBy: Selector<TState, keyof TItem>;
    sortDirection: Selector<TState, 'asc' | 'desc'>;
}, actions: {
    setFilter: (filter: string) => BaseAction;
    setSort: (sortBy: keyof TItem, direction: 'asc' | 'desc') => BaseAction;
}): {
    filteredData: TItem[];
    filter: string;
    sortBy: keyof TItem;
    sortDirection: 'asc' | 'desc';
    setFilter: (filter: string) => void;
    setSort: (sortBy: keyof TItem, direction: 'asc' | 'desc') => void;
    clearFilters: () => void;
};
//# sourceMappingURL=hooks.d.ts.map