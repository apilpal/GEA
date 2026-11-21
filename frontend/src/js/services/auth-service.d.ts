interface LoginCredentials {
    username_or_email: string;
    password: string;
}
interface AuthUser {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    is_guest?: boolean;
    guest_token?: string;
    expires_at?: string;
    created_at?: string;
    updated_at?: string;
}
declare class AuthService {
    private readonly USER_KEY;
    private readonly ACCESS_TOKEN_KEY;
    private readonly REFRESH_THRESHOLD;
    private readonly TOKEN_CHECK_INTERVAL;
    private refreshPromise;
    private lastRefreshCheck;
    private tokenCheckInterval;
    private currentAccessToken;
    private startTokenValidation;
    private stopTokenValidation;
    private storeAccessToken;
    private getStoredAccessToken;
    private clearAccessToken;
    private validateAndRefreshToken;
    getAuthHeader(): string | null;
    validateTokenWithBackend(): Promise<boolean>;
    logout(): Promise<{
        error?: string;
    }>;
    login(credentials: LoginCredentials): Promise<{
        data?: AuthUser;
        error?: string;
    }>;
    refreshToken(): Promise<{
        success: boolean;
        error?: string;
    }>;
    private performTokenRefresh;
    getCurrentUser(): Promise<{
        data?: AuthUser;
        error?: string;
    }>;
    initialize(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    getStoredUser(): AuthUser | null;
    private storeUser;
    private clearStoredData;
    private parseErrorMessage;
    createGuestUser(): Promise<{
        data?: AuthUser;
        error?: string;
    }>;
    getGuestDashboardData(): Promise<{
        data?: any;
        error?: string;
    }>;
    convertGuestToUser(username: string, email: string, password: string): Promise<{
        data?: AuthUser;
        error?: string;
    }>;
    isGuestUser(): boolean;
    getCurrentGuestUser(): AuthUser | null;
    isGuestSessionExpired(): boolean;
    ensureGuestAccess(): Promise<{
        data?: AuthUser;
        error?: string;
    }>;
}
export declare const authService: AuthService;
export {};
//# sourceMappingURL=auth-service.d.ts.map