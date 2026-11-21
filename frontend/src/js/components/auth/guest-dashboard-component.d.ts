export declare class GuestDashboardComponent {
    private guestDashboardContainer;
    private upgradePromptShown;
    constructor();
    initialize(): Promise<void>;
    private loadGuestDashboardData;
    private renderGuestDashboard;
    private updateGuestSummaryData;
    private addGuestIndicator;
    private showUpgradePrompt;
    private dismissUpgradePrompt;
    private handleUpgradeNow;
    private showGuestDashboardError;
    private setupEventListeners;
    private isGuestUser;
    getCurrentGuestUser(): any | null;
    refresh(): Promise<void>;
    destroy(): void;
    private showLoadingState;
    private hideLoadingState;
    private showEmptyState;
}
export declare const guestDashboardComponent: GuestDashboardComponent;
//# sourceMappingURL=guest-dashboard-component.d.ts.map