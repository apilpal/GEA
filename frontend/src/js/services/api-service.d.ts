interface ApiResponse<T> {
    data?: T;
    error?: string;
    status?: number;
    message?: string;
    timestamp?: string;
}
interface ApiConfig {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
declare class ApiService {
    private baseUrl;
    private abortController;
    private timeoutId;
    private defaultConfig;
    private refreshPromise;
    private cancelPendingRequests;
    private createTimeoutPromise;
    private retryRequest;
    get<T>(endpoint: string, params?: Record<string, string>, config?: Partial<ApiConfig>): Promise<ApiResponse<T>>;
    post<T>(endpoint: string, data: any, config?: Partial<ApiConfig>): Promise<ApiResponse<T>>;
    put<T>(endpoint: string, data: any, config?: Partial<ApiConfig>): Promise<ApiResponse<T>>;
    delete<T>(endpoint: string, config?: Partial<ApiConfig>): Promise<ApiResponse<T>>;
    private handleTokenRefresh;
    private performTokenRefresh;
    healthCheck(): Promise<boolean>;
    cancelAllRequests(): void;
}
export declare const apiService: ApiService;
export {};
//# sourceMappingURL=api-service.d.ts.map