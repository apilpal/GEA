export interface Student {
    route: string;
    name: string;
    father_name: string;
    mobile: string;
    class: string;
    address: string;
    fees?: string;
    id?: string;
    status?: 'active' | 'inactive';
    created_date?: string;
    last_updated?: string;
    driver?: string;
    contact_info?: ContactInfo;
    location_details?: LocationDetails;
}
export interface ContactInfo {
    primary_mobile: string;
    secondary_mobile: string;
    father_contact: string;
}
export interface LocationDetails {
    route_number: string;
    full_address: string;
    area: string;
}
//# sourceMappingURL=types.d.ts.map