declare global {
    interface Window {
        generateAllReports: () => Promise<void>;
        refreshDrivers: () => Promise<void>;
        showAddDriverModal: () => void;
    }
}
export {};
//# sourceMappingURL=app-controller.d.ts.map