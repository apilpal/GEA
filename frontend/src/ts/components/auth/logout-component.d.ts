import { BaseComponent } from '@/ts/components/core/index';
export declare class LogoutComponent extends BaseComponent {
    private logoutBtn;
    private confirmDialog;
    private errorDiv;
    private loading;
    constructor();
    private bindMethods;
    protected render(): void;
    private setupElementReferences;
    protected setupEventListeners(): void;
    private handleLogoutClick;
    private handleConfirmLogout;
    private handleCancelLogout;
    private handleDialogClose;
    private performLogout;
    private setLoading;
    private showError;
    private clearError;
    protected handleError(error: Error, context: string): void;
}
//# sourceMappingURL=logout-component.d.ts.map