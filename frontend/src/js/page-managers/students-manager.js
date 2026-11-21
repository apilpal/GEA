import { apiService } from '@/ts/services/api-service';
export async function loadStudentsForStudentsPage() {
    try {
        const response = await apiService.get('/students/');
        const studentsData = response.data?.students || response.data.students || response.data || [];
        const studentTable = document.querySelector('student-table');
        if (studentTable && Array.isArray(studentsData)) {
            studentTable.setStudents(studentsData);
        }
    }
    catch (error) {
        console.error('Failed to load students:', error);
    }
}
//# sourceMappingURL=students-manager.js.map