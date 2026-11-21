class Config {
    constructor() {
        this.apiBaseUrl = this.getEnvVar('VITE_API_BASE_URL', '/api');
        this.apiTimeout = this.getEnvVarNumber('VITE_API_TIMEOUT', 10000);
        this.appName = this.getEnvVar('VITE_APP_NAME', 'School Management System');
        this.appVersion = this.getEnvVar('VITE_APP_VERSION', '1.0.0');
        this.appEnv = this.getEnvVar('VITE_APP_ENV', 'development');
        this.authRefreshThreshold = this.getEnvVarNumber('VITE_AUTH_REFRESH_THRESHOLD', 300000);
        this.enableDebugMode = this.getEnvVarBoolean('VITE_ENABLE_DEBUG_MODE', false);
        this.enableAnalytics = this.getEnvVarBoolean('VITE_ENABLE_ANALYTICS', false);
        this.enableErrorReporting = this.getEnvVarBoolean('VITE_ENABLE_ERROR_REPORTING', false);
        this.googleMapsApiKey = this.getEnvVarOptional('VITE_GOOGLE_MAPS_API_KEY');
        this.defaultTheme = this.getEnvVar('VITE_DEFAULT_THEME', 'light');
        this.enableDarkMode = this.getEnvVarBoolean('VITE_ENABLE_DARK_MODE', true);
        this.enableServiceWorker = this.getEnvVarBoolean('VITE_ENABLE_SERVICE_WORKER', false);
        this.cacheExpiry = this.getEnvVarNumber('VITE_CACHE_EXPIRY', 3600000);
        this.sentryDsn = this.getEnvVarOptional('VITE_SENTRY_DSN');
        this.gaTrackingId = this.getEnvVarOptional('VITE_GA_TRACKING_ID');
        this.mixpanelToken = this.getEnvVarOptional('VITE_MIXPANEL_TOKEN');
        this.cspReportUri = this.getEnvVarOptional('VITE_CSP_REPORT_URI');
        this.cdnBaseUrl = this.getEnvVarOptional('VITE_CDN_BASE_URL');
        this.apiRateLimit = this.getEnvVarNumber('VITE_API_RATE_LIMIT', 100);
        this.apiRateWindow = this.getEnvVarNumber('VITE_API_RATE_WINDOW', 60000);
        this.validateConfig();
    }
    getEnvVar(key, defaultValue) {
        return import.meta.env[key] || defaultValue;
    }
    getEnvVarOptional(key) {
        return import.meta.env[key];
    }
    getEnvVarNumber(key, defaultValue) {
        const value = import.meta.env[key];
        if (value === undefined)
            return defaultValue;
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            console.warn(`Invalid number value for ${key}: ${value}, using default: ${defaultValue}`);
            return defaultValue;
        }
        return parsed;
    }
    getEnvVarBoolean(key, defaultValue) {
        const value = import.meta.env[key];
        if (value === undefined)
            return defaultValue;
        if (value.toLowerCase() === 'true')
            return true;
        if (value.toLowerCase() === 'false')
            return false;
        console.warn(`Invalid boolean value for ${key}: ${value}, using default: ${defaultValue}`);
        return defaultValue;
    }
    validateConfig() {
        if (!this.apiBaseUrl) {
            throw new Error('API base URL is required');
        }
        if (!['development', 'production', 'test'].includes(this.appEnv)) {
            throw new Error(`Invalid app environment: ${this.appEnv}`);
        }
        if (!['light', 'dark'].includes(this.defaultTheme)) {
            throw new Error(`Invalid default theme: ${this.defaultTheme}`);
        }
        this.validateApiBaseUrl();
        if (this.sentryDsn) {
            try {
                new URL(this.sentryDsn);
            }
            catch {
                throw new Error(`Invalid Sentry DSN: ${this.sentryDsn}`);
            }
        }
        console.log(`Configuration loaded for environment: ${this.appEnv}`);
    }
    validateApiBaseUrl() {
        if (this.apiBaseUrl.startsWith('/')) {
            if (this.apiBaseUrl.length === 1 && this.apiBaseUrl === '/') {
                throw new Error('API base URL cannot be just "/" - must include API path');
            }
            return;
        }
        try {
            const url = new URL(this.apiBaseUrl);
            if (!url.protocol.match(/^https?:$/)) {
                throw new Error(`API base URL must use HTTP or HTTPS protocol, got: ${url.protocol}`);
            }
            if (url.protocol === 'http:' && this.isProduction) {
                console.warn('WARNING: Using HTTP in production environment. Consider using HTTPS.');
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('protocol')) {
                throw new Error(`Invalid API base URL: ${this.apiBaseUrl}. Must be a relative path (e.g., "/api") or absolute URL (e.g., "https://api.example.com")`);
            }
            throw new Error(`Invalid API base URL: ${this.apiBaseUrl}`);
        }
    }
    get isDevelopment() {
        return this.appEnv === 'development';
    }
    get isProduction() {
        return this.appEnv === 'production';
    }
    get isTest() {
        return this.appEnv === 'test';
    }
    get baseUrl() {
        return this.apiBaseUrl;
    }
    get fullAppName() {
        return this.isDevelopment ? `${this.appName} (Dev)` : this.appName;
    }
}
export const config = new Config();
//# sourceMappingURL=config.js.map