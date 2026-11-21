export declare class AppError extends Error {
    readonly code?: string | undefined;
    readonly statusCode?: number | undefined;
    constructor(message: string, code?: string | undefined, statusCode?: number | undefined);
}
export declare function handleApiError(error: unknown, context: string): void;
export declare function handleAsyncOperation<T>(operation: () => Promise<T>, context: string, onSuccess?: (result: T) => void, onError?: (error: unknown) => void): Promise<T | void>;
export declare function showErrorToast(message: string): void;
export declare function showSuccessToast(message: string): void;
export declare function showInfoToast(message: string): void;
//# sourceMappingURL=error-handler.d.ts.map