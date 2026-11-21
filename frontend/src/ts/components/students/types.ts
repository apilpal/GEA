// Student-related types

/**
 * Interface representing a student record with all possible fields.
 * Used for displaying and managing student data in the transport management system.
 * Contains comprehensive student information including personal details, contact info, and transportation data.
 */
export interface Student {
    /** Transportation route assigned to the student */
    route: string;
    /** Full name of the student */
    name: string;
    /** Father's name of the student */
    father_name: string;
    /** Primary mobile contact number */
    mobile: string;
    /** Academic class/grade of the student */
    class: string;
    /** Residential address of the student */
    address: string;
    /** Transportation fees (optional) */
    fees?: string;
    /** Unique database identifier */
    id?: string;
    /** Current status of the student record */
    status?: 'active' | 'inactive';
    /** Date when the record was created */
    created_date?: string;
    /** Date when the record was last modified */
    last_updated?: string;
    /** Driver name assigned to transport this student */
    driver?: string;
    /** Extended contact information */
    contact_info?: ContactInfo;
    /** Detailed location information */
    location_details?: LocationDetails;
}

/**
 * Interface for extended contact information for students.
 * Provides additional contact numbers for communication purposes.
 */
export interface ContactInfo {
    /** Primary mobile number for the student */
    primary_mobile: string;
    /** Secondary mobile number for backup contact */
    secondary_mobile: string;
    /** Father's contact number for emergency situations */
    father_contact: string;
}

/**
 * Interface for detailed location information for student pickup/drop-off.
 * Provides comprehensive address information for route planning.
 */
export interface LocationDetails {
    /** Specific route number for transportation planning */
    route_number: string;
    /** Complete address including street, building, etc. */
    full_address: string;
    /** Area or neighborhood name for location identification */
    area: string;
}