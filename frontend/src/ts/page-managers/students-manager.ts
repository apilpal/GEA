// Students page manager
import { apiService } from '@/ts/services/api-service';

/**
 * Loads student data for the students page and populates the student table component.
 * Fetches all students from the API and updates the student table with the retrieved data.
 * @returns {Promise<void>} Resolves when students have been loaded and table updated.
 */
export async function loadStudentsForStudentsPage(): Promise<void> {
    try {
        const response = await apiService.get('/students/');
        const studentsData = (response.data as any)?.students || (response.data as any).students || response.data || [];

        const studentTable = document.querySelector('student-table') as any;
        if (studentTable && Array.isArray(studentsData)) {
            studentTable.setStudents(studentsData);
        }
    } catch (error) {
        console.error('Failed to load students:', error);
    }
}