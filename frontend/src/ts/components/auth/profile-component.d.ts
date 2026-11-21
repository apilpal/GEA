import { BaseComponent } from '@/ts/components/core/index';
export declare class ProfileComponent extends BaseComponent {
    private profileData;
    private usernameInput;
    private emailInput;
    private submitBtn;
    private errorDiv;
    private loading;
    constructor();
    private bindMethods;
    protected render(): void;
    private setupElementReferences;
    protected setupEventListeners(): void;
    private loadProfile;
    private displayProfile;
    private populateForm;
    private handleInputChange;
    private handleSubmit;
    private updateProfile;
    private setLoading;
    private showError;
    private clearError;
    private showNoProfile;
    refreshProfile(): void;
}
//# sourceMappingURL=profile-component.d.ts.map