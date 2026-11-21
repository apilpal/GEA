// Student Service for frontend
import { apiService } from './api-service';

/** Represents a complete student record with all possible fields. */
interface Student {
    /** Transportation route assigned to the student */
    route?: string;
    /** Full name of the student */
    name: string;
    /** Father's name */
    father_name?: string;
    /** Mother's name */
    mother_name?: string;
    /** Primary contact mobile number */
    mobile?: string;
    /** Academic class/grade */
    class?: string;
    /** Residential address */
    address?: string;
    /** Transportation fees amount */
    fees?: number;
    /** Unique database identifier */
    id?: string;
    /** Current status of the student record */
    status?: 'active' | 'inactive';
    /** Timestamp when record was created */
    created_at?: number;
    /** Timestamp when record was last updated */
    updated_at?: number;
    /** Assigned driver name */
    driver?: string;
    /** Extended contact information */
    contact_info?: {
        /** Primary mobile number */
        primary_mobile?: string;
        /** Secondary mobile number */
        secondary_mobile?: string;
        /** Father's contact number */
        father_contact?: string;
        /** Mother's contact number */
        mother_contact?: string;
        /** Emergency contact number */
        emergency_contact?: string;
    };
    /** Detailed location information */
    location_details?: {
        /** Route number for transportation */
        route_number?: string;
        /** Complete address */
        full_address?: string;
        /** Area/neighborhood */
        area?: string;
        /** Nearby landmark */
        landmark?: string;
        /** GPS coordinates */
        coordinates?: {
            /** Latitude coordinate */
            latitude: number;
            /** Longitude coordinate */
            longitude: number;
        };
    };
    /** Date of birth */
    date_of_birth?: string;
    /** School admission date */
    admission_date?: string;
}

/** Response structure for student list queries. */
interface StudentResponse {
    /** Array of student records */
    students: Student[];
    /** Total count of students matching the query */
    total_count: number;
}

/** Request structure for creating a new student record. */
interface CreateStudentRequest {
    /** Transportation route assignment */
    route?: string;
    /** Student full name (required) */
    name: string;
    /** Father's name */
    father_name?: string;
    /** Mother's name */
    mother_name?: string;
    /** Primary contact mobile */
    mobile?: string;
    /** Academic class */
    class?: string;
    /** Residential address */
    address?: string;
    /** Transportation fees */
    fees?: number;
    /** Initial status */
    status?: 'active' | 'inactive';
    /** Date of birth */
    date_of_birth?: string;
    /** School admission date */
    admission_date?: string;
}

/** Request structure for updating an existing student record. */
interface UpdateStudentRequest {
    /** Transportation route assignment */
    route?: string;
    /** Student full name */
    name?: string;
    /** Father's name */
    father_name?: string;
    /** Mother's name */
    mother_name?: string;
    /** Primary contact mobile */
    mobile?: string;
    /** Academic class */
    class?: string;
    /** Residential address */
    address?: string;
    /** Transportation fees */
    fees?: number;
    /** Status update */
    status?: 'active' | 'inactive';
    /** Date of birth */
    date_of_birth?: string;
    /** School admission date */
    admission_date?: string;
}

/**
 * Service class for managing student data operations with the backend API.
 * Provides CRUD operations and search functionality for student records.
 */
class StudentService {
    /**
     * Retrieves a paginated list of students.
     * @param {number} skip - Number of records to skip (default: 0)
     * @param {number} limit - Maximum number of records to return (default: 100)
     * @returns {Promise<Student[]>} Array of student records
     * @throws {Error} When the API request fails
     */
    async getStudents(skip: number = 0, limit: number = 100): Promise<Student[]> {
        const response = await apiService.get<StudentResponse>('/students', {
            skip: skip.toString(),
            limit: limit.toString()
        });
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data?.students || [];
    }

    /**
     * Retrieves a single student by their ID.
     * @param {number} studentId - The unique identifier of the student
     * @returns {Promise<Student>} The student record
     * @throws {Error} When the student is not found or API request fails
     */
    async getStudentById(studentId: number): Promise<Student> {
        const response = await apiService.get<Student>(`/students/${studentId}`);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Student not found');
        }
        return response.data;
    }

    /**
     * Creates a new student record.
     * @param {CreateStudentRequest} student - The student data to create
     * @returns {Promise<Student>} The created student record with ID
     * @throws {Error} When the creation fails
     */
    async createStudent(student: CreateStudentRequest): Promise<Student> {
        const response = await apiService.post<Student>('/students', student);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Failed to create student');
        }
        return response.data;
    }

    /**
     * Updates an existing student record.
     * @param {number} studentId - The ID of the student to update
     * @param {UpdateStudentRequest} student - The updated student data
     * @returns {Promise<Student>} The updated student record
     * @throws {Error} When the update fails
     */
    async updateStudent(studentId: number, student: UpdateStudentRequest): Promise<Student> {
        const response = await apiService.put<Student>(`/students/${studentId}`, student);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Failed to update student');
        }
        return response.data;
    }

    /**
     * Deletes a student record by ID.
     * @param {number} studentId - The ID of the student to delete
     * @returns {Promise<void>} Resolves when deletion is successful
     * @throws {Error} When the deletion fails
     */
    async deleteStudent(studentId: number): Promise<void> {
        const response = await apiService.delete(`/students/${studentId}`);
        if (response.error) {
            throw new Error(response.error);
        }
    }

    /**
     * Searches for students matching the given query.
     * @param {string} query - The search query string
     * @returns {Promise<Student[]>} Array of matching student records
     * @throws {Error} When the search request fails
     */
    async searchStudents(query: string): Promise<Student[]> {
        const response = await apiService.get<StudentResponse>(`/students/search?q=${encodeURIComponent(query)}`);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data?.students || [];
    }
}

// Export singleton instance
export const studentService = new StudentService();

// Export types
export type { Student, StudentResponse, CreateStudentRequest, UpdateStudentRequest };