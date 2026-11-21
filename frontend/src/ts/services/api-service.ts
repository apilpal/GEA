// API client with per-request cancellation and bearer-token authentication.
import { config } from '@/ts/config';

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

class ApiService {
    private readonly baseUrl = config.apiBaseUrl;
    private readonly defaultConfig: ApiConfig = { timeout: config.apiTimeout, retries: 0, retryDelay: 250 };
    private readonly controllers = new Set<AbortController>();
    private refreshPromise: Promise<boolean> | null = null;

    private buildUrl(endpoint: string, params?: Record<string, string>): string {
        const url = /^https?:\/\//i.test(endpoint)
            ? new URL(endpoint)
            : new URL(`${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`, window.location.origin);
        if (params) Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        return url.toString();
    }

    private getAccessToken(): string | null {
        try { return localStorage.getItem('access_token'); } catch { return null; }
    }

    private async request<T>(
        method: string,
        endpoint: string,
        body?: unknown,
        params?: Record<string, string>,
        options: Partial<ApiConfig> = {},
        allowRefresh = true
    ): Promise<ApiResponse<T>> {
        const requestConfig = { ...this.defaultConfig, ...options };
        const controller = new AbortController();
        this.controllers.add(controller);
        const timeoutId = window.setTimeout(() => controller.abort(), requestConfig.timeout);
        const headers = new Headers({ Accept: 'application/json' });
        if (body !== undefined) headers.set('Content-Type', 'application/json');

        const isPublicAuthEndpoint = /\/auth\/(login|bypass-login|token\/refresh)$/.test(endpoint);
        const token = this.getAccessToken();
        if (token && !isPublicAuthEndpoint) headers.set('Authorization', `Bearer ${token}`);

        try {
            const response = await fetch(this.buildUrl(endpoint, params), {
                method,
                headers,
                credentials: 'include',
                signal: controller.signal,
                ...(body === undefined ? {} : { body: JSON.stringify(body) })
            });

            if (response.status === 401 && allowRefresh && !isPublicAuthEndpoint && await this.handleTokenRefresh()) {
                return this.request<T>(method, endpoint, body, params, options, false);
            }

            const contentType = response.headers.get('content-type') || '';
            const payload = response.status === 204 ? undefined
                : contentType.includes('application/json') ? await response.json().catch(() => undefined)
                : await response.text().catch(() => '');

            if (!response.ok) {
                const detail = payload && typeof payload === 'object'
                    ? (payload as { detail?: unknown; error?: unknown }).detail ?? (payload as { error?: unknown }).error
                    : payload;
                const error = typeof detail === 'string' ? detail : `HTTP ${response.status}${detail ? `: ${JSON.stringify(detail)}` : ''}`;
                return { error, status: response.status, message: response.statusText, timestamp: new Date().toISOString() };
            }

            return { data: payload as T, status: response.status, timestamp: new Date().toISOString() };
        } catch (error) {
            const message = error instanceof Error && error.name === 'AbortError'
                ? `Request timed out after ${requestConfig.timeout}ms`
                : error instanceof Error ? error.message : 'Unknown network error';
            return { error: message, timestamp: new Date().toISOString() };
        } finally {
            window.clearTimeout(timeoutId);
            this.controllers.delete(controller);
        }
    }

    async get<T>(endpoint: string, params?: Record<string, string>, options?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
        return this.request<T>('GET', endpoint, undefined, params, options);
    }

    async post<T>(endpoint: string, data: unknown, options?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
        return this.request<T>('POST', endpoint, data, undefined, options);
    }

    async put<T>(endpoint: string, data: unknown, options?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
        return this.request<T>('PUT', endpoint, data, undefined, options);
    }

    async delete<T>(endpoint: string, options?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
        return this.request<T>('DELETE', endpoint, undefined, undefined, options);
    }

    private async handleTokenRefresh(): Promise<boolean> {
        if (!this.refreshPromise) {
            this.refreshPromise = (async () => {
                try {
                    const { authService } = await import('./auth-service');
                    return (await authService.refreshToken()).success;
                } catch {
                    return false;
                }
            })();
        }
        try { return await this.refreshPromise; }
        finally { this.refreshPromise = null; }
    }

    async healthCheck(): Promise<boolean> {
        const response = await this.get('/health', undefined, { timeout: 5000 });
        return !response.error;
    }

    cancelAllRequests(): void {
        this.controllers.forEach((controller) => controller.abort());
        this.controllers.clear();
    }
}

export const apiService = new ApiService();
