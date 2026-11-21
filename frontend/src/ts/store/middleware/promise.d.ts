import { Middleware, BaseAction } from '@/ts/types/store';
export interface PromiseConfig {
    global?: boolean;
    suffixes?: {
        request?: string;
        success?: string;
        failure?: string;
    };
    promiseType?: string | symbol;
}
export declare function createPromise<TState = any>(config?: PromiseConfig): Middleware<TState>;
export declare const promise: Middleware<any>;
export declare function createPromiseAction<T = any>(type: string, promise: Promise<T>, meta?: Record<string, any>): BaseAction & {
    promise: Promise<T>;
};
export declare const PromiseUtils: {
    actionCreator: <TArgs extends any[], T = any>(type: string, promiseFn: (...args: TArgs) => Promise<T>) => (...args: TArgs) => BaseAction<string, any> & {
        promise: Promise<T>;
    };
    wrapPromise: <T extends any[], R>(fn: (...args: T) => Promise<R>) => (...args: T) => BaseAction & {
        promise: Promise<R>;
    };
    withMeta: <T = any>(type: string, promise: Promise<T>, meta: Record<string, any>) => BaseAction<string, any> & {
        promise: Promise<T>;
    };
};
export declare const PromiseActions: {
    apiCall: <TArgs extends any[], TResponse = any>(baseType: string, apiFn: (...args: TArgs) => Promise<TResponse>) => (...args: TArgs) => {
        type: string;
        promise: Promise<TResponse>;
    };
    submitForm: <TFormData, TResponse = any>(formData: TFormData, submitFn: (data: TFormData) => Promise<TResponse>) => {
        type: string;
        promise: Promise<TResponse>;
        meta: {
            formData: TFormData;
        };
    };
    fetchData: <TParams = any, TResponse = any>(params: TParams, fetchFn: (params: TParams) => Promise<TResponse>) => {
        type: string;
        promise: Promise<TResponse>;
        meta: {
            params: TParams;
        };
    };
};
//# sourceMappingURL=promise.d.ts.map