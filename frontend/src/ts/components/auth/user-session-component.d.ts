import { BaseComponent } from '@/ts/components/core/index';
export declare class UserSessionComponent extends BaseComponent {
    private authUnsubscribe;
    private currentAuthState;
    private logoutBtn;
    private confirmDialog;
    private errorDiv;
    private loading;
    constructor();
    private bindMethods;
    protected render(): void;
    private setupElementReferences;
    protected setupEventListeners(): void;
    private subscribeToAuth;
    private handleAuthStateChange;
    private updateUserDisplay;
    private handleLogoutClick;
    private handleConfirmLogout;
    private handleCancelLogout;
    private handleDialogClose;
    private performLogout;
    private setLoading;
    private showError;
    private clearError;
    protected handleError(error: Error, context: string): void;
    disconnectedCallback(): void;
}
//# sourceMappingURL=user-session-component.d.ts.map