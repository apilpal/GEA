/**
 * Centralized Mock Configuration
 * Provides proper mocks for external dependencies used across tests
 */

// API Service Mock
export const mockApiService = {
  getStudents: jest.fn(),
  getStudentById: jest.fn(),
  createStudent: jest.fn(),
  updateStudent: jest.fn(),
  deleteStudent: jest.fn(),
  getDrivers: jest.fn(),
  getDriverByName: jest.fn(),
  createDriver: jest.fn(),
  updateDriver: jest.fn(),
  getReports: jest.fn(),
  getCharts: jest.fn(),
  authenticate: jest.fn(),
  refreshToken: jest.fn(),
};

// Auth Service Mock
export const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  getCurrentUser: jest.fn(),
  refreshSession: jest.fn(),
  isAuthenticated: jest.fn(),
};

// Student Service Mock
export const mockStudentService = {
  fetchStudents: jest.fn(),
  fetchStudentById: jest.fn(),
  saveStudent: jest.fn(),
  deleteStudent: jest.fn(),
  searchStudents: jest.fn(),
  filterStudents: jest.fn(),
  sortStudents: jest.fn(),
};

// Chart Service Mock
export const mockChartService = {
  fetchChartData: jest.fn(),
  generateChart: jest.fn(),
  updateChart: jest.fn(),
  deleteChart: jest.fn(),
  getChartTypes: jest.fn(),
};

// Driver Service Mock
export const mockDriverService = {
  fetchDrivers: jest.fn(),
  fetchDriverByName: jest.fn(),
  saveDriver: jest.fn(),
  deleteDriver: jest.fn(),
  assignDriverToRoute: jest.fn(),
  getDriverStats: jest.fn(),
};

// External Dependencies Mocks
export const mockExternalDependencies = {
  // Axios mock for HTTP requests
  axios: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },

  // Lodash utilities mock (if used)
  lodash: {
    debounce: jest.fn((fn) => fn),
    throttle: jest.fn((fn) => fn),
    isEmpty: jest.fn(),
    cloneDeep: jest.fn(),
  },

  // Date utilities mock
  dateUtils: {
    formatDate: jest.fn(),
    parseDate: jest.fn(),
    isValidDate: jest.fn(),
  },

  // Validation utilities mock
  validationUtils: {
    validateEmail: jest.fn(),
    validatePhone: jest.fn(),
    validateRequired: jest.fn(),
  },
};

// Setup default mock implementations
export function setupDefaultMocks() {
  // API Service default implementations
  mockApiService.getStudents.mockResolvedValue([]);
  mockApiService.getStudentById.mockResolvedValue(null);
  mockApiService.createStudent.mockResolvedValue({ id: '1', name: 'Test Student' });
  mockApiService.updateStudent.mockResolvedValue({ id: '1', name: 'Updated Student' });
  mockApiService.deleteStudent.mockResolvedValue(true);
  mockApiService.getDrivers.mockResolvedValue([]);
  mockApiService.getDriverByName.mockResolvedValue(null);
  mockApiService.createDriver.mockResolvedValue({ name: 'Test Driver' });
  mockApiService.updateDriver.mockResolvedValue({ name: 'Updated Driver' });
  mockApiService.getReports.mockResolvedValue([]);
  mockApiService.getCharts.mockResolvedValue([]);
  mockApiService.authenticate.mockResolvedValue({ token: 'mock-token', user: { id: '1' } });
  mockApiService.refreshToken.mockResolvedValue({ token: 'new-mock-token' });

  // Auth Service default implementations
  mockAuthService.login.mockResolvedValue({ token: 'mock-token', user: { id: '1' } });
  mockAuthService.logout.mockResolvedValue(true);
  mockAuthService.register.mockResolvedValue({ id: '1', username: 'testuser' });
  mockAuthService.getCurrentUser.mockResolvedValue({ id: '1', username: 'testuser' });
  mockAuthService.refreshSession.mockResolvedValue({ token: 'new-token' });
  mockAuthService.isAuthenticated.mockReturnValue(true);

  // Student Service default implementations
  mockStudentService.fetchStudents.mockResolvedValue([]);
  mockStudentService.fetchStudentById.mockResolvedValue(null);
  mockStudentService.saveStudent.mockResolvedValue({ id: '1' });
  mockStudentService.deleteStudent.mockResolvedValue(true);
  mockStudentService.searchStudents.mockResolvedValue([]);
  mockStudentService.filterStudents.mockReturnValue([]);
  mockStudentService.sortStudents.mockReturnValue([]);

  // Chart Service default implementations
  mockChartService.fetchChartData.mockResolvedValue({ labels: [], datasets: [] });
  mockChartService.generateChart.mockResolvedValue({ id: '1', type: 'bar' });
  mockChartService.updateChart.mockResolvedValue({ id: '1', updated: true });
  mockChartService.deleteChart.mockResolvedValue(true);
  mockChartService.getChartTypes.mockReturnValue(['bar', 'pie', 'line']);

  // Driver Service default implementations
  mockDriverService.fetchDrivers.mockResolvedValue([]);
  mockDriverService.fetchDriverByName.mockResolvedValue(null);
  mockDriverService.saveDriver.mockResolvedValue({ name: 'Test Driver' });
  mockDriverService.deleteDriver.mockResolvedValue(true);
  mockDriverService.assignDriverToRoute.mockResolvedValue(true);
  mockDriverService.getDriverStats.mockResolvedValue({ totalStudents: 0, routes: [] });

  // External dependencies default implementations
  mockExternalDependencies.axios.get.mockResolvedValue({ data: {} });
  mockExternalDependencies.axios.post.mockResolvedValue({ data: {} });
  mockExternalDependencies.axios.put.mockResolvedValue({ data: {} });
  mockExternalDependencies.axios.delete.mockResolvedValue({ data: {} });

  mockExternalDependencies.lodash.debounce.mockImplementation((fn) => fn);
  mockExternalDependencies.lodash.throttle.mockImplementation((fn) => fn);
  mockExternalDependencies.lodash.isEmpty.mockReturnValue(true);
  mockExternalDependencies.lodash.cloneDeep.mockImplementation((obj) => JSON.parse(JSON.stringify(obj)));

  mockExternalDependencies.dateUtils.formatDate.mockReturnValue('01/01/2024');
  mockExternalDependencies.dateUtils.parseDate.mockReturnValue(new Date());
  mockExternalDependencies.dateUtils.isValidDate.mockReturnValue(true);

  mockExternalDependencies.validationUtils.validateEmail.mockReturnValue(true);
  mockExternalDependencies.validationUtils.validatePhone.mockReturnValue(true);
  mockExternalDependencies.validationUtils.validateRequired.mockReturnValue(true);
}

// Reset all mocks to their default state
export function resetAllMocks() {
  Object.values(mockApiService).forEach(mock => mock.mockClear());
  Object.values(mockAuthService).forEach(mock => mock.mockClear());
  Object.values(mockStudentService).forEach(mock => mock.mockClear());
  Object.values(mockChartService).forEach(mock => mock.mockClear());
  Object.values(mockDriverService).forEach(mock => mock.mockClear());
  Object.values(mockExternalDependencies.axios).forEach(mock => mock.mockClear());
  Object.values(mockExternalDependencies.lodash).forEach(mock => mock.mockClear());
  Object.values(mockExternalDependencies.dateUtils).forEach(mock => mock.mockClear());
  Object.values(mockExternalDependencies.validationUtils).forEach(mock => mock.mockClear());

  setupDefaultMocks();
}

// Apply mocks globally
export function applyGlobalMocks() {
  // Apply API service mocks
  jest.mock('../services/api-service', () => ({
    ApiService: mockApiService,
  }));

  // Apply auth service mocks
  jest.mock('../services/auth-service', () => ({
    AuthService: mockAuthService,
  }));

  // Apply student service mocks
  jest.mock('../services/student-service', () => ({
    StudentService: mockStudentService,
  }));

  // Apply external dependency mocks
  jest.mock('axios', () => mockExternalDependencies.axios);
  jest.mock('lodash', () => mockExternalDependencies.lodash);

  setupDefaultMocks();
}

// Export all mocks for individual use in tests
export {
  mockApiService as ApiService,
  mockAuthService as AuthService,
  mockStudentService as StudentService,
  mockChartService as ChartService,
  mockDriverService as DriverService,
  mockExternalDependencies as ExternalDependencies,
};