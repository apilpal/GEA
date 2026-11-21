import { apiService } from './services/api-service';
declare global {
    interface Window {
        generateAllReports: () => Promise<void>;
        refreshDrivers: () => Promise<void>;
        showAddDriverModal: () => void;
    }
}
export { apiService };
//# sourceMappingURL=script.d.ts.map