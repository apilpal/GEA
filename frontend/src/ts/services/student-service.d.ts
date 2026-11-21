interface Student {
    route?: string;
    name: string;
    father_name?: string;
    mother_name?: string;
    mobile?: string;
    class?: string;
    address?: string;
    fees?: number;
    id?: string;
    status?: 'active' | 'inactive';
    created_at?: number;
    updated_at?: number;
    driver?: string;
    contact_info?: {
        primary_mobile?: string;
        secondary_mobile?: string;
        father_contact?: string;
        mother_contact?: string;
        emergency_contact?: string;
    };
    location_details?: {
        route_number?: string;
        full_address?: string;
        area?: string;
        landmark?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    date_of_birth?: string;
    admission_date?: string;
}
interface StudentResponse {
    students: Student[];
    total_count: number;
}
interface CreateStudentRequest {
    route?: string;
    name: string;
    father_name?: string;
    mother_name?: string;
    mobile?: string;
    class?: string;
    address?: string;
    fees?: number;
    status?: 'active' | 'inactive';
    date_of_birth?: string;
    admission_date?: string;
}
interface UpdateStudentRequest {
    route?: string;
    name?: string;
    father_name?: string;
    mother_name?: string;
    mobile?: string;
    class?: string;
    address?: string;
    fees?: number;
    status?: 'active' | 'inactive';
    date_of_birth?: string;
    admission_date?: string;
}
declare class StudentService {
    getStudents(skip?: number, limit?: number): Promise<Student[]>;
    getStudentById(studentId: number): Promise<Student>;
    createStudent(student: CreateStudentRequest): Promise<Student>;
    updateStudent(studentId: number, student: UpdateStudentRequest): Promise<Student>;
    deleteStudent(studentId: number): Promise<void>;
    searchStudents(query: string): Promise<Student[]>;
}
export declare const studentService: StudentService;
export type { Student, StudentResponse, CreateStudentRequest, UpdateStudentRequest };
//# sourceMappingURL=student-service.d.ts.map