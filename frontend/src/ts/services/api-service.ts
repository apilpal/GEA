// API Service for frontend with enhanced error handling and features
import { config } from '@/ts/config';

/**
 * Standard API response structure with typed data and error handling.
 */
interface ApiResponse<T> {
    /** The response data if successful */
    data?: T;
    /** Error message if the request failed */
    error?: string;
    /** HTTP status code */
    status?: number;
    /** HTTP status message */
    message?: string;
    /** Timestamp of the response */
    timestamp?: string;
}

/**
 * Configuration options for API requests.
 */
interface ApiConfig {
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Number of retry attempts for failed requests */
    retries?: number;
    /** Delay between retry attempts in milliseconds */
    retryDelay?: number;
}

/**
 * Service class for handling HTTP API requests with retry logic, timeout handling, and error management.
 * Provides GET, POST, PUT, and DELETE methods with automatic retry and cancellation capabilities.
 * Includes automatic token refresh on authentication failures.
 */
class ApiService {
    private baseUrl: string = config.apiBaseUrl;
    private abortController: AbortController | null = null;
    private timeoutId: number | null = null;
    private defaultConfig: ApiConfig = {
        timeout: config.apiTimeout,
        retries: 3,
        retryDelay: 1000 // 1 second
    };
    private refreshPromise: Promise<boolean> | null = null;

    // Debug logs for AbortController
    private logAbortController(action: string, method?: string, endpoint?: string) {
        console.log(`[AbortController-DEBUG] ${action}: ${method || 'unknown'} ${endpoint || 'unknown endpoint'}, abortController: ${this.abortController ? 'exists' : 'null'}`);
    }

    /**
     * Cancels any pending requests to prevent race conditions and improve performance.
     */
    private cancelPendingRequests() {
        this.logAbortController('cancelPendingRequests start');
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            this.logAbortController('aborted and set to null');
        } else {
            console.log('[AbortController-DEBUG] cancelPendingRequests: no abortController to abort');
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    /**
     * Creates a timeout promise that rejects after the specified time.
     * @param {number} timeout - Timeout duration in milliseconds.
     * @returns {Promise<never>} Promise that rejects on timeout.
     */
    private createTimeoutPromise(timeout: number): Promise<never> {
        return new Promise((_, reject) => {
            this.timeoutId = window.setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
        });
    }

    /**
     * Implements retry mechanism for failed requests with exponential backoff.
     * @param {function(): Promise<Response>} requestFn - Function that returns a fetch request.
     * @param {number} retries - Number of retry attempts.
     * @param {number} delay - Base delay between retries in milliseconds.
     * @returns {Promise<Response>} The successful response or throws after all retries fail.
     */
    private async retryRequest<T>(
        requestFn: () => Promise<Response>,
        retries: number,
        delay: number
    ): Promise<Response> {
        for (let i = 0; i <= retries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                if (i === retries) throw error;

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                console.warn(`Request failed, retrying (${i + 1}/${retries})...`, error);
            }
        }
        throw new Error('All retries failed');
    }

    /**
     * Performs a GET request to the specified API endpoint.
     * Automatically handles token refresh on 401 responses.
     * @param {string} endpoint - API endpoint path (will be prefixed with base URL).
     * @param {Record<string, string>} params - Query parameters to append to the URL.
     * @param {Partial<ApiConfig>} config - Optional configuration for timeout, retries, etc.
     * @returns {Promise<ApiResponse<T>>} Promise resolving to the API response.
     */
    async get<T>(
        endpoint: string,
        params?: Record<string, string>,
        config?: Partial<ApiConfig>
    ): Promise<ApiResponse<T>> {
        const finalConfig = { ...this.defaultConfig, ...config };
        const requestId = `GET-${endpoint}-${Date.now()}`;

        console.log(`[API-DEBUG] ${requestId}: Starting GET request to ${endpoint}`);
        console.log(`[API-DEBUG] ${requestId}: Full URL: ${this.baseUrl}${endpoint}`);
        console.log(`[API-DEBUG] ${requestId}: Params:`, params);
        console.log(`[API-DEBUG] ${requestId}: Config:`, finalConfig);

        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();

            // Handle both absolute and relative URLs correctly
            let url: string;
            if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
                url = endpoint; // Absolute URL
            } else if (endpoint.startsWith('/')) {
                // Absolute path from root - avoid double slashes
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint.substring(1)}`;
                } else {
                    url = `${this.baseUrl}${endpoint}`;
                }
            } else {
                // Relative path - add base URL
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint}`;
                } else {
                    url = `${this.baseUrl}/${endpoint}`;
                }
            }
            
            if (params) {
                const queryString = new URLSearchParams(params).toString();
                url += `?${queryString}`;
            }

            console.log(`[API-DEBUG] ${requestId}: Final URL: ${url}`);

            const requestFn = () => {
                console.log(`[API-DEBUG] ${requestId}: Making fetch request`);
                console.log(`[AbortController-DEBUG] Accessing signal for ${requestId}: ${this.abortController ? 'exists' : 'null'}`);
                return fetch(url, {
                    signal: this.abortController!.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        // Cookies are sent automatically with credentials: 'include'
                    },
                    credentials: 'include'
                });
            };

            const startTime = Date.now();
            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries!, finalConfig.retryDelay!),
                this.createTimeoutPromise(finalConfig.timeout!)
            ]);
            const requestDuration = Date.now() - startTime;

            this.abortController = null;

            console.log(`[API-DEBUG] ${requestId}: Response received in ${requestDuration}ms`);
            console.log(`[API-DEBUG] ${requestId}: Response status: ${response.status} ${response.statusText}`);
            console.log(`[API-DEBUG] ${requestId}: Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                // Handle authentication errors
                if (response.status === 401) {
                    console.log(`[API-DEBUG] ${requestId}: 401 response, attempting token refresh`);
                    // Try to refresh token automatically
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        console.log(`[API-DEBUG] ${requestId}: Token refresh successful, retrying original request`);
                        // Retry the original request after refresh
                        return this.get<T>(endpoint, params, config);
                    }
                    console.log(`[API-DEBUG] ${requestId}: Token refresh failed, returning auth expired error`);
                    return {
                        error: 'Authentication expired. Please log in again.',
                        status: response.status,
                        message: response.statusText,
                        timestamp: new Date().toISOString()
                    };
                }

                const errorText = await response.text().catch(() => response.statusText);
                console.log(`[API-DEBUG] ${requestId}: Error response body:`, errorText);
                return {
                    error: `HTTP ${response.status}: ${errorText}`,
                    status: response.status,
                    message: response.statusText,
                    timestamp: new Date().toISOString()
                };
            }

            const data = await response.json();
            console.log(`[API-DEBUG] ${requestId}: Success response data:`, JSON.stringify(data, null, 2));
            return {
                data,
                status: response.status,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[API-DEBUG] ${requestId}: API GET error:`, errorMessage);
            console.error(`[API-DEBUG] ${requestId}: Error details:`, error instanceof Error ? error.stack : 'Unknown error type');
            return {
                error: errorMessage,
                timestamp: new Date().toISOString()
            };
        }
    }

    async post<T>(
        endpoint: string,
        data: any,
        config?: Partial<ApiConfig>
    ): Promise<ApiResponse<T>> {
        const finalConfig = { ...this.defaultConfig, ...config };

        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();

            // Handle both absolute and relative URLs correctly
            let url: string;
            if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
                url = endpoint; // Absolute URL
            } else if (endpoint.startsWith('/')) {
                // Absolute path from root - avoid double slashes
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint.substring(1)}`;
                } else {
                    url = `${this.baseUrl}${endpoint}`;
                }
            } else {
                // Relative path - add base URL
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint}`;
                } else {
                    url = `${this.baseUrl}/${endpoint}`;
                }
            }

            const requestFn = () => fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                signal: this.abortController!.signal,
                credentials: 'include'
            });

            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries!, finalConfig.retryDelay!),
                this.createTimeoutPromise(finalConfig.timeout!)
            ]);

            this.abortController = null;
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }

            if (!response.ok) {
                // Handle authentication errors for POST requests (login doesn't need refresh)
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        // Retry the original request after refresh
                        return this.post<T>(endpoint, data, config);
                    }
                    return {
                        error: 'Authentication expired. Please log in again.',
                        status: response.status,
                        message: response.statusText
                    };
                }

                const errorText = await response.text().catch(() => response.statusText);
                return {
                    error: `HTTP ${response.status}: ${errorText}`,
                    status: response.status,
                    message: response.statusText
                };
            }

            const responseData = await response.json();
            return { data: responseData, status: response.status };
        } catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('API POST error:', errorMessage);
            return { error: errorMessage };
        }
    }

    async put<T>(
        endpoint: string,
        data: any,
        config?: Partial<ApiConfig>
    ): Promise<ApiResponse<T>> {
        const finalConfig = { ...this.defaultConfig, ...config };

        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();

            // Handle both absolute and relative URLs correctly
            let url: string;
            if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
                url = endpoint; // Absolute URL
            } else if (endpoint.startsWith('/')) {
                // Absolute path from root - avoid double slashes
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint.substring(1)}`;
                } else {
                    url = `${this.baseUrl}${endpoint}`;
                }
            } else {
                // Relative path - add base URL
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint}`;
                } else {
                    url = `${this.baseUrl}/${endpoint}`;
                }
            }

            const requestFn = () => fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                signal: this.abortController!.signal,
                credentials: 'include'
            });

            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries!, finalConfig.retryDelay!),
                this.createTimeoutPromise(finalConfig.timeout!)
            ]);

            this.abortController = null;

            if (!response.ok) {
                if (response.status === 401) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        return this.put<T>(endpoint, data, config);
                    }
                    return {
                        error: 'Authentication expired. Please log in again.',
                        status: response.status,
                        message: response.statusText
                    };
                }

                const errorText = await response.text().catch(() => response.statusText);
                return {
                    error: `HTTP ${response.status}: ${errorText}`,
                    status: response.status,
                    message: response.statusText
                };
            }

            const responseData = await response.json();
            return { data: responseData, status: response.status };
        } catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('API PUT error:', errorMessage);
            return { error: errorMessage };
        }
    }

    async delete<T>(
        endpoint: string,
        config?: Partial<ApiConfig>
    ): Promise<ApiResponse<T>> {
        const finalConfig = { ...this.defaultConfig, ...config };

        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();

            // Handle both absolute and relative URLs correctly
            let url: string;
            if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
                url = endpoint; // Absolute URL
            } else if (endpoint.startsWith('/')) {
                // Absolute path from root - avoid double slashes
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint.substring(1)}`;
                } else {
                    url = `${this.baseUrl}${endpoint}`;
                }
            } else {
                // Relative path - add base URL
                if (this.baseUrl.endsWith('/')) {
                    url = `${this.baseUrl}${endpoint}`;
                } else {
                    url = `${this.baseUrl}/${endpoint}`;
                }
            }

            const requestFn = () => fetch(url, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                signal: this.abortController!.signal,
                credentials: 'include'
            });

            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries!, finalConfig.retryDelay!),
                this.createTimeoutPromise(finalConfig.timeout!)
            ]);

            this.abortController = null;

            if (!response.ok) {
                if (response.status === 401) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        return this.delete<T>(endpoint, config);
                    }
                    return {
                        error: 'Authentication expired. Please log in again.',
                        status: response.status,
                        message: response.statusText
                    };
                }

                const errorText = await response.text().catch(() => response.statusText);
                return {
                    error: `HTTP ${response.status}: ${errorText}`,
                    status: response.status,
                    message: response.statusText
                };
            }

            const responseData = await response.json();
            return { data: responseData, status: response.status };
        } catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('API DELETE error:', errorMessage);
            return { error: errorMessage };
        }
    }

    /**
     * Handle automatic token refresh when receiving 401 errors.
     * @returns {Promise<boolean>} True if refresh was successful.
     */
    private async handleTokenRefresh(): Promise<boolean> {
        // Prevent multiple concurrent refresh attempts
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.performTokenRefresh();
        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * Perform the actual token refresh by calling the refresh endpoint.
     * @returns {Promise<boolean>} True if refresh was successful.
     */
    private async performTokenRefresh(): Promise<boolean> {
        try {
            // Import auth service dynamically to avoid circular dependencies
            const { authService } = await import('./auth-service');

            const refreshResult = await authService.refreshToken();
            return refreshResult.success || false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Utility method to check if the API is reachable
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.get('/health', {}, { timeout: 5000, retries: 1 });
            return !response.error;
        } catch {
            return false;
        }
    }

    /**
     * Cancel all pending requests
     */
    cancelAllRequests(): void {
        this.cancelPendingRequests();
    }
}

// Export singleton instance
export const apiService = new ApiService();