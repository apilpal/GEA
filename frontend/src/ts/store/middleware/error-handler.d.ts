import { Middleware, BaseAction } from '@/ts/types/store';
export type ErrorHandler<TState = any, TAction extends BaseAction = BaseAction> = (error: Error, store: {
    getState: () => TState;
    dispatch: (action: TAction) => TAction;
}, action: TAction, retries: number) => void | Promise<void>;
export interface ErrorHandlerConfig<TState = any, TAction extends BaseAction = BaseAction> {
    errorHandler?: ErrorHandler<TState, TAction>;
    reThrow?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    ignoreActions?: string[];
    shouldHandleError?: (action: TAction, error: Error) => boolean;
}
export declare function createErrorHandler<TState = any, TAction extends BaseAction = BaseAction>(config?: ErrorHandlerConfig<TState, TAction>): Middleware<TState, TAction>;
export declare const errorHandler: Middleware<any, BaseAction<string, any>>;
export declare const toastErrorHandler: Middleware<any, BaseAction<string, any>>;
export declare const reportingErrorHandler: Middleware<any, BaseAction<string, any>>;
export declare const ErrorHandlerUtils: {
    createErrorAction: (type: string, error: Error, originalAction?: BaseAction) => {
        type: string;
        payload: Error;
        error: boolean;
        meta: {
            originalAction: BaseAction<string, any> | undefined;
            timestamp: number;
        };
    };
    createRetryAction: (originalAction: BaseAction, retryCount: number) => {
        meta: {
            retryCount: number;
            isRetry: boolean;
        };
        type: string;
        payload?: any;
        error?: boolean;
    };
    isErrorAction: (action: BaseAction) => boolean;
    isRetryAction: (action: BaseAction) => boolean;
    getRetryCount: (action: BaseAction) => number;
};
export declare const CommonErrorHandlers: {
    apiErrorHandler: (error: Error, store: any, action: BaseAction) => void;
    formErrorHandler: (error: Error, store: any, action: BaseAction) => void;
    authErrorHandler: (error: Error, store: any, action: BaseAction) => void;
};
//# sourceMappingURL=error-handler.d.ts.map