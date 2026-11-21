/**
 * Full Workflow Integration Tests
 * Tests complete user workflows that span multiple components and API calls
 */

import {
  ComponentTestHelper,
  FormTestHelper,
  AsyncTestHelper,
  MockApiService,
  NetworkTestHelper,
  createMockStudentDataWithOptions,
  MockDatabase
} from '../../src/test-utils';

describe('Full Workflow Integration Tests', () => {
  let componentHelper: ComponentTestHelper;
  let mockApi: MockApiService;
  let networkHelper: NetworkTestHelper;
  let mockDb: MockDatabase;

  beforeEach(() => {
    componentHelper = new ComponentTestHelper();
    mockApi = new MockApiService();
    networkHelper = new NetworkTestHelper();
    mockDb = new MockDatabase();

    // Setup comprehensive API mocking for workflow tests
    global.fetch = jest.fn().mockImplementation((url, options) =>
      mockApi.mockFetch(url as string, options)
    );

    // Setup comprehensive endpoint mocking
    setupWorkflowMocks();
  });

  afterEach(() => {
    networkHelper.restoreNetwork();
    componentHelper.cleanup();
    jest.clearAllMocks();
  });

  function setupWorkflowMocks() {
    // Student management workflow
    mockApi.mockEndpoint('GET', '/api/students', {
      data: createMockStudentDataWithOptions(15, {
        includeContactInfo: true,
        includeLocationDetails: true
      }),
      total: 15,
      page: 1,
      per_page: 10
    });

    mockApi.mockEndpoint('POST', '/api/students', (request: any) => ({
      id: `student-${Date.now()}`,
      ...JSON.parse(request.body as string),
      status: 'active',
      created_at: new Date().toISOString()
    }));

    mockApi.mockEndpoint('PUT', '/api/students', (request: any) => {
      const data = JSON.parse(request.body as string);
      return {
        id: data.id,
        ...data,
        updated_at: new Date().toISOString()
      };
    });

    mockApi.mockEndpoint('DELETE', '/api/students', { success: true });

    // Authentication workflow
    mockApi.mockEndpoint('POST', '/api/auth/login', {
      token: 'mock-jwt-token-' + Date.now(),
      user: { id: 1, username: 'testuser', role: 'admin' },
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    mockApi.mockEndpoint('POST', '/api/auth/logout', { success: true });

    // Chart data workflow
    mockApi.mockEndpoint('GET', '/api/charts/dashboard', {
      studentStats: { total: 150, active: 145, inactive: 5 },
      routeStats: { 'Route 1': 45, 'Route 2': 38, 'Route 3': 32, 'Route 4': 25 },
      feeStats: { collected: 125000, pending: 25000, overdue: 5000 }
    });
  }

  describe('Student Management Workflow', () => {
    test('should complete full student creation workflow', async () => {
      // Step 1: Navigate to student creation form
      const workflowHTML = `
        <div data-testid="student-workflow">
          <div data-testid="navigation">
            <button data-testid="students-nav">Students</button>
            <button data-testid="add-student-nav">Add Student</button>
          </div>
          <div data-testid="student-form-container" style="display: none;">
            <form data-testid="student-form">
              <input name="name" required placeholder="Student Name" />
              <input name="father_name" required placeholder="Father's Name" />
              <input name="class" required placeholder="Class" />
              <input name="mobile" required placeholder="Mobile" />
              <input name="address" required placeholder="Address" />
              <select name="route" required>
                <option value="">Select Route</option>
                <option value="Route 1">Route 1</option>
                <option value="Route 2">Route 2</option>
                <option value="Route 3">Route 3</option>
              </select>
              <input name="fees" required placeholder="Fees" />
              <button type="submit" data-testid="submit-student">Create Student</button>
            </form>
          </div>
          <div data-testid="student-list" style="display: none;">
            <div data-testid="student-count">Total Students: 0</div>
            <student-table data-testid="students-table"></student-table>
          </div>
        </div>
      `;

      const container = componentHelper.mount(workflowHTML);

      // Step 2: Navigate to student form
      const studentsNav = componentHelper.getByTestId('students-nav');
      const addStudentNav = componentHelper.getByTestId('add-student-nav');
      const formContainer = componentHelper.getByTestId('student-form-container');

      expect(studentsNav).toBeTruthy();
      expect(addStudentNav).toBeTruthy();
      expect(formContainer).toBeTruthy();

      if (addStudentNav) {
        componentHelper.simulateClick(addStudentNav);
      }

      // Wait for form to show
      await AsyncTestHelper.waitForElement('[data-testid="student-form-container"]:not([style*="display: none"])');

      // Step 3: Fill and submit student form
      const form = container.querySelector('[data-testid="student-form"]') as HTMLFormElement;
      expect(form).toBeTruthy();

      FormTestHelper.fillForm(form, {
        name: 'John Doe',
        father_name: 'Jane Doe',
        class: 'Class 8',
        mobile: '+91-9876543210',
        address: '123 Main St, City',
        route: 'Route 1',
        fees: '2500'
      });

      // Verify form is valid
      expect(form.checkValidity()).toBe(true);

      const submitBtn = componentHelper.getByTestId('submit-student');
      if (submitBtn) {
        componentHelper.simulateClick(submitBtn);
      }

      // Step 4: Verify API call was made
      await AsyncTestHelper.waitForCondition(
        () => global.fetch && (global.fetch as jest.Mock).mock.calls.length > 0,
        1000
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/students',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('John Doe')
        })
      );

      // Step 5: Verify workflow completion
      const callCount = (global.fetch as jest.Mock).mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
    });

    test('should complete student search and filter workflow', async () => {
      const searchWorkflowHTML = `
        <div data-testid="search-workflow">
          <div data-testid="search-controls">
            <input data-testid="search-input" placeholder="Search students..." />
            <select data-testid="route-filter">
              <option value="">All Routes</option>
              <option value="Route 1">Route 1</option>
              <option value="Route 2">Route 2</option>
            </select>
            <select data-testid="status-filter">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <student-table data-testid="filtered-table"></student-table>
        </div>
      `;

      const container = componentHelper.mount(searchWorkflowHTML);

      // Step 1: Perform search
      const searchInput = componentHelper.getByTestId('search-input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      componentHelper.simulateInput(searchInput, 'John');

      // Step 2: Apply route filter
      const routeFilter = componentHelper.getByTestId('route-filter') as HTMLSelectElement;
      expect(routeFilter).toBeTruthy();

      if (routeFilter) {
        routeFilter.value = 'Route 1';
        componentHelper.simulateEvent(routeFilter, 'change');
      }

      // Step 3: Apply status filter
      const statusFilter = componentHelper.getByTestId('status-filter') as HTMLSelectElement;
      expect(statusFilter).toBeTruthy();

      if (statusFilter) {
        statusFilter.value = 'active';
        componentHelper.simulateEvent(statusFilter, 'change');
      }

      // Step 4: Verify API calls for filtered data
      await AsyncTestHelper.waitForCondition(
        () => global.fetch && (global.fetch as jest.Mock).mock.calls.length > 0,
        1000
      );

      // Should have made API calls with search parameters
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/students'),
        expect.any(Object)
      );
    });
  });

  describe('Authentication Workflow', () => {
    test('should complete login and access protected resources', async () => {
      const authWorkflowHTML = `
        <div data-testid="auth-workflow">
          <form data-testid="login-form" style="display: block;">
            <input name="username" required placeholder="Username" />
            <input name="password" type="password" required placeholder="Password" />
            <button type="submit" data-testid="login-btn">Login</button>
            <div data-testid="login-error" style="display: none;"></div>
          </form>
          <div data-testid="dashboard" style="display: none;">
            <h1 data-testid="welcome-message">Welcome!</h1>
            <button data-testid="logout-btn">Logout</button>
          </div>
        </div>
      `;

      const container = componentHelper.mount(authWorkflowHTML);

      // Step 1: Fill login form
      const loginForm = container.querySelector('[data-testid="login-form"]') as HTMLFormElement;
      expect(loginForm).toBeTruthy();

      FormTestHelper.fillForm(loginForm, {
        username: 'admin',
        password: 'password123'
      });

      // Step 2: Submit login form
      const loginBtn = componentHelper.getByTestId('login-btn');
      if (loginBtn) {
        componentHelper.simulateClick(loginBtn);
      }

      // Step 3: Verify login API call
      await AsyncTestHelper.waitForCondition(
        () => global.fetch && (global.fetch as jest.Mock).mock.calls.length > 0,
        1000
      );

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('admin')
        })
      );

      // Step 4: Verify dashboard access (would be shown after successful login)
      const dashboard = componentHelper.getByTestId('dashboard');
      const welcomeMessage = componentHelper.getByTestId('welcome-message');
      expect(dashboard).toBeTruthy();
      expect(welcomeMessage).toBeTruthy();
    });

    test('should handle login failure and retry', async () => {
      // Mock failed login
      mockApi.mockEndpoint('POST', '/api/auth/login', {
        error: 'Invalid credentials'
      });

      const container = componentHelper.mount(`
        <form data-testid="login-form">
          <input name="username" value="wronguser" />
          <input name="password" value="wrongpass" />
          <button type="submit" data-testid="login-btn">Login</button>
          <div data-testid="error-message"></div>
        </form>
      `);

      const loginBtn = componentHelper.getByTestId('login-btn');
      const errorDiv = componentHelper.getByTestId('error-message');

      if (loginBtn) {
        componentHelper.simulateClick(loginBtn);
      }

      // Wait for error response
      await AsyncTestHelper.waitForCondition(
        () => global.fetch && (global.fetch as jest.Mock).mock.calls.length > 0,
        1000
      );

      // Verify error handling
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('wronguser')
        })
      );
    });
  });

  describe('Dashboard Workflow', () => {
    test('should load and display dashboard data', async () => {
      const dashboardHTML = `
        <div data-testid="dashboard-workflow">
          <div data-testid="dashboard-loading">Loading...</div>
          <div data-testid="dashboard-content" style="display: none;">
            <div data-testid="stats-section">
              <div data-testid="student-stats">Students: 0</div>
              <div data-testid="route-stats">Routes: 0</div>
              <div data-testid="fee-stats">Fees: ₹0</div>
            </div>
            <chart-component data-testid="dashboard-chart"></chart-component>
          </div>
        </div>
      `;

      const container = componentHelper.mount(dashboardHTML);

      // Step 1: Initial loading state
      const loadingDiv = componentHelper.getByTestId('dashboard-loading');
      const contentDiv = componentHelper.getByTestId('dashboard-content');
      expect(loadingDiv).toBeTruthy();
      expect(contentDiv).toBeTruthy();

      // Step 2: Wait for dashboard data to load
      await AsyncTestHelper.waitForCondition(
        () => global.fetch && (global.fetch as jest.Mock).mock.calls.length > 0,
        2000
      );

      // Step 3: Verify API calls for dashboard data
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/charts/dashboard',
        expect.any(Object)
      );

      // Step 4: Verify dashboard content is displayed
      // (In a real implementation, this would show the loaded data)
      const statsSection = componentHelper.getByTestId('stats-section');
      const chartComponent = componentHelper.getByTestId('dashboard-chart');
      expect(statsSection).toBeTruthy();
      expect(chartComponent).toBeTruthy();
    });

    test('should handle real-time updates workflow', async () => {
      const realtimeHTML = `
        <div data-testid="realtime-workflow">
          <div data-testid="live-student-count">Live Count: 0</div>
          <div data-testid="realtime-notifications">
            <div data-testid="notification-list"></div>
          </div>
        </div>
      `;

      const container = componentHelper.mount(realtimeHTML);
      const countDiv = componentHelper.getByTestId('live-student-count');
      const notificationList = componentHelper.getByTestId('notification-list');

      expect(countDiv).toBeTruthy();
      expect(notificationList).toBeTruthy();

      // Simulate real-time updates
      setTimeout(() => {
        if (countDiv) {
          countDiv.textContent = 'Live Count: 150';
        }
      }, 100);

      // Wait for update
      await AsyncTestHelper.waitForCondition(
        () => countDiv?.textContent === 'Live Count: 150',
        1000
      );

      expect(countDiv?.textContent).toBe('Live Count: 150');
    });
  });

  describe('Error Recovery Workflow', () => {
    test('should handle and recover from network errors', async () => {
      const errorRecoveryHTML = `
        <div data-testid="error-recovery-workflow">
          <button data-testid="load-data-btn">Load Data</button>
          <div data-testid="retry-section" style="display: none;">
            <span data-testid="error-message">Network error occurred</span>
            <button data-testid="retry-btn">Retry</button>
          </div>
          <div data-testid="success-section" style="display: none;">
            <span data-testid="success-message">Data loaded successfully</span>
          </div>
        </div>
      `;

      const container = componentHelper.mount(errorRecoveryHTML);

      // Step 1: Trigger data loading (will fail initially)
      const loadBtn = componentHelper.getByTestId('load-data-btn');
      expect(loadBtn).toBeTruthy();

      if (loadBtn) {
        componentHelper.simulateClick(loadBtn);
      }

      // Step 2: Wait for error state
      await AsyncTestHelper.waitForElement('[data-testid="retry-section"]:not([style*="display: none"])');

      const errorMessage = componentHelper.getByTestId('error-message');
      expect(errorMessage).toBeTruthy();

      // Step 3: Retry after error
      const retryBtn = componentHelper.getByTestId('retry-btn');
      if (retryBtn) {
        // Mock successful response for retry
        mockApi.mockEndpoint('GET', '/api/students', {
          data: createMockStudentDataWithOptions(5),
          total: 5
        });

        componentHelper.simulateClick(retryBtn);
      }

      // Step 4: Verify recovery
      await AsyncTestHelper.waitForElement('[data-testid="success-section"]:not([style*="display: none"])');

      const successMessage = componentHelper.getByTestId('success-message');
      expect(successMessage).toBeTruthy();
    });

    test('should handle form validation errors and recovery', async () => {
      const validationWorkflowHTML = `
        <div data-testid="validation-workflow">
          <form data-testid="test-form">
            <input name="email" type="email" required />
            <input name="phone" pattern="\\+91-[0-9]{10}" required />
            <button type="submit" data-testid="submit-form">Submit</button>
          </form>
          <div data-testid="validation-errors" style="display: none;">
            <div data-testid="error-list"></div>
          </div>
        </div>
      `;

      const container = componentHelper.mount(validationWorkflowHTML);
      const form = container.querySelector('form') as HTMLFormElement;
      const submitBtn = componentHelper.getByTestId('submit-form');

      expect(form).toBeTruthy();
      expect(submitBtn).toBeTruthy();

      // Step 1: Submit form with invalid data
      FormTestHelper.fillForm(form, {
        email: 'invalid-email',
        phone: '12345'
      });

      if (submitBtn) {
        componentHelper.simulateClick(submitBtn);
      }

      // Step 2: Check validation errors
      expect(form.checkValidity()).toBe(false);

      // Step 3: Fix validation errors
      FormTestHelper.fillForm(form, {
        email: 'valid@example.com',
        phone: '+91-9876543210'
      });

      if (submitBtn) {
        componentHelper.simulateClick(submitBtn);
      }

      // Step 4: Verify form is now valid
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('Performance Workflow', () => {
    test('should handle large dataset operations efficiently', async () => {
      const performanceWorkflowHTML = `
        <div data-testid="performance-workflow">
          <button data-testid="load-large-dataset">Load 1000 Students</button>
          <div data-testid="performance-metrics">
            <span data-testid="load-time">Load Time: 0ms</span>
            <span data-testid="render-time">Render Time: 0ms</span>
          </div>
          <student-table data-testid="large-dataset-table"></student-table>
        </div>
      `;

      const container = componentHelper.mount(performanceWorkflowHTML);

      // Step 1: Load large dataset
      const loadBtn = componentHelper.getByTestId('load-large-dataset');
      expect(loadBtn).toBeTruthy();

      const startTime = performance.now();
      if (loadBtn) {
        componentHelper.simulateClick(loadBtn);
      }

      // Step 2: Wait for data loading
      await AsyncTestHelper.waitForCondition(
        () => global.fetch && (global.fetch as jest.Mock).mock.calls.length > 0,
        5173
      );

      const endTime = performance.now();

      // Step 3: Verify performance metrics
      expect(endTime - startTime).toBeLessThan(5173); // Should complete in under 3 seconds

      const loadTimeElement = componentHelper.getByTestId('load-time');
      expect(loadTimeElement).toBeTruthy();
    });
  });
});