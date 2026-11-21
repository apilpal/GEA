import { BaseComponent } from '@/ts/components/core/index';
export declare class LoginComponent extends BaseComponent {
    private usernameInput;
    private passwordInput;
    private submitBtn;
    private errorDiv;
    private loading;
    constructor();
    private bindMethods;
    protected render(): void;
    private setupElementReferences;
    protected setupEventListeners(): void;
    private handleInputChange;
    private handleSubmit;
    private attemptLogin;
    private setLoading;
    private showError;
    private clearError;
    reset(): void;
    focusUsername(): void;
}
//# sourceMappingURL=login-component.d.ts.map