import { BaseComponent } from '@/ts/components/core/index';
export declare class RegisterComponent extends BaseComponent {
    private usernameInput;
    private emailInput;
    private passwordInput;
    private confirmPasswordInput;
    private submitBtn;
    private errorDiv;
    private loading;
    constructor();
    private bindMethods;
    protected render(): void;
    private setupElementReferences;
    protected setupEventListeners(): void;
    private handleInputChange;
    private validatePasswordMatch;
    private handleSubmit;
    private attemptRegistration;
    private setLoading;
    private showError;
    private clearError;
    reset(): void;
    focusUsername(): void;
}
//# sourceMappingURL=register-component.d.ts.map