// Driver-related types

/**
 * Interface defining the data structure for driver information display.
 * Contains basic driver details and statistics for the transport management system.
 */
export interface DriverInfoData {
    /** Full name of the driver */
    name: string;
    /** Optional route assignment for the driver */
    route?: string;
    /** Current status of the driver */
    status?: 'active' | 'inactive';
    /** Total number of students assigned to this driver */
    total_students?: number;
    /** Vehicle registration number assigned to the driver */
    vehicle_number?: string;
    /** Contact phone number for the driver */
    contact_number?: string;
}