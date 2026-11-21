import { config } from '@/ts/config';
class ApiService {
    constructor() {
        this.baseUrl = config.apiBaseUrl;
        this.abortController = null;
        this.timeoutId = null;
        this.defaultConfig = {
            timeout: config.apiTimeout,
            retries: 3,
            retryDelay: 1000
        };
        this.refreshPromise = null;
    }
    cancelPendingRequests() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            this.timeoutId = window.setTimeout(() => {
                reject(new Error(`Request timeout after ${timeout}ms`));
            }, timeout);
        });
    }
    async retryRequest(requestFn, retries, delay) {
        for (let i = 0; i <= retries; i++) {
            try {
                return await requestFn();
            }
            catch (error) {
                if (i === retries)
                    throw error;
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
                console.warn(`Request failed, retrying (${i + 1}/${retries})...`, error);
            }
        }
        throw new Error('All retries failed');
    }
    async get(endpoint, params, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const requestId = `GET-${endpoint}-${Date.now()}`;
        console.log(`[API-DEBUG] ${requestId}: Starting GET request to ${endpoint}`);
        console.log(`[API-DEBUG] ${requestId}: Full URL: ${this.baseUrl}${endpoint}`);
        console.log(`[API-DEBUG] ${requestId}: Params:`, params);
        console.log(`[API-DEBUG] ${requestId}: Config:`, finalConfig);
        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();
            let url = `${this.baseUrl}${endpoint}`;
            if (params) {
                const queryString = new URLSearchParams(params).toString();
                url += `?${queryString}`;
            }
            console.log(`[API-DEBUG] ${requestId}: Final URL: ${url}`);
            const requestFn = () => {
                console.log(`[API-DEBUG] ${requestId}: Making fetch request`);
                return fetch(url, {
                    signal: this.abortController.signal,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include'
                });
            };
            const startTime = Date.now();
            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries, finalConfig.retryDelay),
                this.createTimeoutPromise(finalConfig.timeout)
            ]);
            const requestDuration = Date.now() - startTime;
            this.abortController = null;
            console.log(`[API-DEBUG] ${requestId}: Response received in ${requestDuration}ms`);
            console.log(`[API-DEBUG] ${requestId}: Response status: ${response.status} ${response.statusText}`);
            console.log(`[API-DEBUG] ${requestId}: Response headers:`, Object.fromEntries(response.headers.entries()));
            if (!response.ok) {
                if (response.status === 401) {
                    console.log(`[API-DEBUG] ${requestId}: 401 response, attempting token refresh`);
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        console.log(`[API-DEBUG] ${requestId}: Token refresh successful, retrying original request`);
                        return this.get(endpoint, params, config);
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
        }
        catch (error) {
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
    async post(endpoint, data, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();
            const requestFn = () => fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                signal: this.abortController.signal,
                credentials: 'include'
            });
            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries, finalConfig.retryDelay),
                this.createTimeoutPromise(finalConfig.timeout)
            ]);
            this.abortController = null;
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
            if (!response.ok) {
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        return this.post(endpoint, data, config);
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
        }
        catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('API POST error:', errorMessage);
            return { error: errorMessage };
        }
    }
    async put(endpoint, data, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();
            const requestFn = () => fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data),
                signal: this.abortController.signal,
                credentials: 'include'
            });
            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries, finalConfig.retryDelay),
                this.createTimeoutPromise(finalConfig.timeout)
            ]);
            this.abortController = null;
            if (!response.ok) {
                if (response.status === 401) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        return this.put(endpoint, data, config);
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
        }
        catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('API PUT error:', errorMessage);
            return { error: errorMessage };
        }
    }
    async delete(endpoint, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        try {
            this.cancelPendingRequests();
            this.abortController = new AbortController();
            const requestFn = () => fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                signal: this.abortController.signal,
                credentials: 'include'
            });
            const response = await Promise.race([
                this.retryRequest(requestFn, finalConfig.retries, finalConfig.retryDelay),
                this.createTimeoutPromise(finalConfig.timeout)
            ]);
            this.abortController = null;
            if (!response.ok) {
                if (response.status === 401) {
                    const refreshResult = await this.handleTokenRefresh();
                    if (refreshResult) {
                        return this.delete(endpoint, config);
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
        }
        catch (error) {
            this.abortController = null;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('API DELETE error:', errorMessage);
            return { error: errorMessage };
        }
    }
    async handleTokenRefresh() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        this.refreshPromise = this.performTokenRefresh();
        try {
            const result = await this.refreshPromise;
            return result;
        }
        finally {
            this.refreshPromise = null;
        }
    }
    async performTokenRefresh() {
        try {
            const { authService } = await import('./auth-service');
            const refreshResult = await authService.refreshToken();
            return refreshResult.success || false;
        }
        catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }
    async healthCheck() {
        try {
            const response = await this.get('/health', {}, { timeout: 5000, retries: 1 });
            return !response.error;
        }
        catch {
            return false;
        }
    }
    cancelAllRequests() {
        this.cancelPendingRequests();
    }
}
export const apiService = new ApiService();
//# sourceMappingURL=api-service.js.map