interface AuthUser {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
interface AuthState {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}
interface AuthContextValue {
    state: AuthState;
    login: (credentials: {
        username_or_email: string;
        password: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    refreshAuth: () => Promise<void>;
    clearError: () => void;
}
declare class AuthContext {
    private state;
    private listeners;
    subscribe(listener: (state: AuthState) => void): () => void;
    getState(): AuthState;
    private setState;
    private notifyListeners;
    initialize(): Promise<void>;
    login(credentials: {
        username_or_email: string;
        password: string;
    }): Promise<void>;
    logout(): Promise<void>;
    refreshAuth(): Promise<void>;
    clearError(): void;
    hasRole(role: string): boolean;
    hasAnyRole(roles: string[]): boolean;
    isAdmin(): boolean;
    isTeacherOrAdmin(): boolean;
    private createGuestUserForBypass;
}
declare const authContext: AuthContext;
export declare function useAuth(): AuthContextValue;
export { authContext };
export type { AuthUser, AuthState, AuthContextValue };
//# sourceMappingURL=auth-context.d.ts.map