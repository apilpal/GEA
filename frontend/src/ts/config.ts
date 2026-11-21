/**
 * Configuration management for the frontend application.
 * Provides type-safe access to environment variables with validation.
 *
 * Note: import.meta.env is available in Vite and needs to be properly typed.
 * If TypeScript complains about import.meta.env, this is expected in some setups.
 */

// Type declaration for Vite's import.meta.env
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_API_TIMEOUT?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_APP_VERSION?: string;
    readonly VITE_APP_ENV?: string;
    readonly VITE_AUTH_REFRESH_THRESHOLD?: string;
    readonly VITE_ENABLE_DEBUG_MODE?: string;
    readonly VITE_ENABLE_ANALYTICS?: string;
    readonly VITE_ENABLE_ERROR_REPORTING?: string;
    readonly VITE_GOOGLE_MAPS_API_KEY?: string;
    readonly VITE_DEFAULT_THEME?: string;
    readonly VITE_ENABLE_DARK_MODE?: string;
    readonly VITE_ENABLE_SERVICE_WORKER?: string;
    readonly VITE_CACHE_EXPIRY?: string;
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_GA_TRACKING_ID?: string;
    readonly VITE_MIXPANEL_TOKEN?: string;
    readonly VITE_CSP_REPORT_URI?: string;
    readonly VITE_CDN_BASE_URL?: string;
    readonly VITE_API_RATE_LIMIT?: string;
    readonly VITE_API_RATE_WINDOW?: string;
    readonly VITE_ENABLE_LOGIN_BYPASS?: string;
    readonly VITE_LOGIN_BYPASS_USER?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface AppConfig {
    // API Configuration
    apiBaseUrl: string;
    apiTimeout: number;

    // Application Configuration
    appName: string;
    appVersion: string;
    appEnv: 'development' | 'production' | 'test';

    // Authentication Configuration
    authRefreshThreshold: number;

    // Feature Flags
    enableDebugMode: boolean;
    enableAnalytics: boolean;
    enableErrorReporting: boolean;

    // External Services
    googleMapsApiKey?: string;

    // UI Configuration
    defaultTheme: 'light' | 'dark';
    enableDarkMode: boolean;

    // Performance Configuration
    enableServiceWorker: boolean;
    cacheExpiry: number;

    // Monitoring and Analytics
    sentryDsn?: string;
    gaTrackingId?: string;
    mixpanelToken?: string;

    // Security
    cspReportUri?: string;

    // CDN Configuration
    cdnBaseUrl?: string;

    // Rate Limiting
    apiRateLimit: number;
    apiRateWindow: number;

    // Authentication Bypass
    enableLoginBypass: boolean;
    loginBypassUser: string;
}

class Config implements AppConfig {
    // API Configuration
    apiBaseUrl: string;
    apiTimeout: number;

    // Application Configuration
    appName: string;
    appVersion: string;
    appEnv: 'development' | 'production' | 'test';

    // Authentication Configuration
    authRefreshThreshold: number;

    // Feature Flags
    enableDebugMode: boolean;
    enableAnalytics: boolean;
    enableErrorReporting: boolean;

    // External Services
    googleMapsApiKey?: string;

    // UI Configuration
    defaultTheme: 'light' | 'dark';
    enableDarkMode: boolean;

    // Performance Configuration
    enableServiceWorker: boolean;
    cacheExpiry: number;

    // Monitoring and Analytics
    sentryDsn?: string;
    gaTrackingId?: string;
    mixpanelToken?: string;

    // Security
    cspReportUri?: string;

    // CDN Configuration
    cdnBaseUrl?: string;

    // Rate Limiting
    apiRateLimit: number;
    apiRateWindow: number;

    // Authentication Bypass
    enableLoginBypass: boolean;
    loginBypassUser: string;

    constructor() {
        // API Configuration
        this.apiBaseUrl = this.getEnvVar('VITE_API_BASE_URL', 'http://127.0.0.1:8000/api');
        this.apiTimeout = this.getEnvVarNumber('VITE_API_TIMEOUT', 10000);

        // Application Configuration
        this.appName = this.getEnvVar('VITE_APP_NAME', 'School Management System');
        this.appVersion = this.getEnvVar('VITE_APP_VERSION', '1.0.0');
        this.appEnv = this.getEnvVar('VITE_APP_ENV', 'development') as 'development' | 'production' | 'test';

        // Authentication Configuration
        this.authRefreshThreshold = this.getEnvVarNumber('VITE_AUTH_REFRESH_THRESHOLD', 517300);

        // Feature Flags
        this.enableDebugMode = this.getEnvVarBoolean('VITE_ENABLE_DEBUG_MODE', false);
        this.enableAnalytics = this.getEnvVarBoolean('VITE_ENABLE_ANALYTICS', false);
        this.enableErrorReporting = this.getEnvVarBoolean('VITE_ENABLE_ERROR_REPORTING', false);

        // External Services
        this.googleMapsApiKey = this.getEnvVarOptional('VITE_GOOGLE_MAPS_API_KEY');

        // UI Configuration
        this.defaultTheme = this.getEnvVar('VITE_DEFAULT_THEME', 'light') as 'light' | 'dark';
        this.enableDarkMode = this.getEnvVarBoolean('VITE_ENABLE_DARK_MODE', true);

        // Performance Configuration
        this.enableServiceWorker = this.getEnvVarBoolean('VITE_ENABLE_SERVICE_WORKER', false);
        this.cacheExpiry = this.getEnvVarNumber('VITE_CACHE_EXPIRY', 3600000);

        // Monitoring and Analytics
        this.sentryDsn = this.getEnvVarOptional('VITE_SENTRY_DSN');
        this.gaTrackingId = this.getEnvVarOptional('VITE_GA_TRACKING_ID');
        this.mixpanelToken = this.getEnvVarOptional('VITE_MIXPANEL_TOKEN');

        // Security
        this.cspReportUri = this.getEnvVarOptional('VITE_CSP_REPORT_URI');

        // CDN Configuration
        this.cdnBaseUrl = this.getEnvVarOptional('VITE_CDN_BASE_URL');

        // Rate Limiting
        this.apiRateLimit = this.getEnvVarNumber('VITE_API_RATE_LIMIT', 100);
        this.apiRateWindow = this.getEnvVarNumber('VITE_API_RATE_WINDOW', 60000);

        // Authentication Bypass
        this.enableLoginBypass = this.getEnvVarBoolean('VITE_ENABLE_LOGIN_BYPASS', false);
        this.loginBypassUser = this.getEnvVar('VITE_LOGIN_BYPASS_USER', 'admin');

        this.validateConfig();
    }

    private getEnvVar(key: string, defaultValue: string): string {
        return (import.meta.env as any)[key] || defaultValue;
    }

    private getEnvVarOptional(key: string): string | undefined {
        return (import.meta.env as any)[key];
    }

    private getEnvVarNumber(key: string, defaultValue: number): number {
        const value = (import.meta.env as any)[key];
        if (value === undefined) return defaultValue;

        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            console.warn(`Invalid number value for ${key}: ${value}, using default: ${defaultValue}`);
            return defaultValue;
        }
        return parsed;
    }

    private getEnvVarBoolean(key: string, defaultValue: boolean): boolean {
        const value = (import.meta.env as any)[key];
        if (value === undefined) return defaultValue;

        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        console.warn(`Invalid boolean value for ${key}: ${value}, using default: ${defaultValue}`);
        return defaultValue;
    }

    private validateConfig(): void {
        // Validate required configurations
        if (!this.apiBaseUrl) {
            throw new Error('API base URL is required');
        }

        // Validate environment
        if (!['development', 'production', 'test'].includes(this.appEnv)) {
            throw new Error(`Invalid app environment: ${this.appEnv}`);
        }

        // Validate theme
        if (!['light', 'dark'].includes(this.defaultTheme)) {
            throw new Error(`Invalid default theme: ${this.defaultTheme}`);
        }

        // Validate API base URL - allow relative URLs for Vite proxy
        this.validateApiBaseUrl();

        if (this.sentryDsn) {
            try {
                new URL(this.sentryDsn);
            } catch {
                throw new Error(`Invalid Sentry DSN: ${this.sentryDsn}`);
            }
        }

        console.log(`Configuration loaded for environment: ${this.appEnv}`);
    }

    private validateApiBaseUrl(): void {
        // Allow relative URLs for Vite proxy (common in development)
        if (this.apiBaseUrl.startsWith('/')) {
            // Relative URL - valid for Vite proxy
            if (this.apiBaseUrl.length === 1 && this.apiBaseUrl === '/') {
                throw new Error('API base URL cannot be just "/" - must include API path');
            }
            return;
        }

        // For absolute URLs, validate with URL constructor
        try {
            const url = new URL(this.apiBaseUrl);

            // Ensure it has a proper protocol for production
            if (!url.protocol.match(/^https?:$/)) {
                throw new Error(`API base URL must use HTTP or HTTPS protocol, got: ${url.protocol}`);
            }

            // Warn about HTTP in production
            if (url.protocol === 'http:' && this.isProduction) {
                console.warn('WARNING: Using HTTP in production environment. Consider using HTTPS.');
            }

        } catch (error) {
            if (error instanceof Error && error.message.includes('protocol')) {
                throw new Error(`Invalid API base URL: ${this.apiBaseUrl}. Must be a relative path (e.g., "/api") or absolute URL (e.g., "https://api.example.com")`);
            }
            throw new Error(`Invalid API base URL: ${this.apiBaseUrl}`);
        }
    }

    // Helper methods
    get isDevelopment(): boolean {
        return this.appEnv === 'development';
    }

    get isProduction(): boolean {
        return this.appEnv === 'production';
    }

    get isTest(): boolean {
        return this.appEnv === 'test';
    }

    get baseUrl(): string {
        return this.apiBaseUrl;
    }

    get fullAppName(): string {
        return this.isDevelopment ? `${this.appName} (Dev)` : this.appName;
    }
}

// Export singleton instance
export const config = new Config();

// Export type for use in other modules
export type { AppConfig };