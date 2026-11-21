import { apiService } from './api-service';
class StudentService {
    async getStudents(skip = 0, limit = 100) {
        const response = await apiService.get('/students', {
            skip: skip.toString(),
            limit: limit.toString()
        });
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data?.students || [];
    }
    async getStudentById(studentId) {
        const response = await apiService.get(`/students/${studentId}`);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Student not found');
        }
        return response.data;
    }
    async createStudent(student) {
        const response = await apiService.post('/students', student);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Failed to create student');
        }
        return response.data;
    }
    async updateStudent(studentId, student) {
        const response = await apiService.put(`/students/${studentId}`, student);
        if (response.error) {
            throw new Error(response.error);
        }
        if (!response.data) {
            throw new Error('Failed to update student');
        }
        return response.data;
    }
    async deleteStudent(studentId) {
        const response = await apiService.delete(`/students/${studentId}`);
        if (response.error) {
            throw new Error(response.error);
        }
    }
    async searchStudents(query) {
        const response = await apiService.get(`/students/search?q=${encodeURIComponent(query)}`);
        if (response.error) {
            throw new Error(response.error);
        }
        return response.data?.students || [];
    }
}
export const studentService = new StudentService();
//# sourceMappingURL=student-service.js.map