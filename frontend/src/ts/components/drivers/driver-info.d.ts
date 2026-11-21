import { BaseComponent } from '@/ts/components/core/index';
import type { DriverInfoData } from './types';
declare class DriverInfo extends BaseComponent {
    private driver;
    private studentCount;
    constructor();
    connectedCallback(): void;
    protected render(): void;
    protected setupEventListeners(): void;
    setDriver(driver: string): void;
    setStudentCount(count: number): void;
    setDriverInfo(info: DriverInfoData): void;
}
export { DriverInfo };
export type { DriverInfoData };
//# sourceMappingURL=driver-info.d.ts.map