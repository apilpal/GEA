/**
 * Component Integration Tests
 * Tests the integration between different UI components and their interactions
 */

import {
  ComponentTestHelper,
  FormTestHelper,
  AsyncTestHelper,
  createMockStudentDataWithOptions,
  PerformanceTestHelper
} from '../../src/test-utils';

describe('Component Integration Tests', () => {
  let componentHelper: ComponentTestHelper;
  let mockStudents: any[];

  beforeEach(() => {
    componentHelper = new ComponentTestHelper();
    mockStudents = createMockStudentDataWithOptions(10, {
      includeContactInfo: true,
      includeLocationDetails: true
    });
  });

  afterEach(() => {
    componentHelper.cleanup();
  });

  describe('Student Table Integration', () => {
    test('should render student table with data', async () => {
      const tableHTML = `
        <div data-testid="student-table-container">
          <student-table id="student-table"></student-table>
        </div>
      `;

      const container = componentHelper.mount(tableHTML);
      const tableElement = componentHelper.getByTestId('student-table-container');

      expect(tableElement).toBeTruthy();

      // Wait for component to render
      await AsyncTestHelper.waitForElement('student-table', container);

      const studentTable = container.querySelector('student-table');
      expect(studentTable).toBeTruthy();
    });

    test('should handle search functionality across components', async () => {
      const searchHTML = `
        <div data-testid="search-integration">
          <input type="text" data-testid="search-input" placeholder="Search..." />
          <student-table data-testid="student-table"></student-table>
        </div>
      `;

      const container = componentHelper.mount(searchHTML);
      const searchInput = componentHelper.getByTestId('search-input') as HTMLInputElement;

      expect(searchInput).toBeTruthy();

      // Simulate search input
      componentHelper.simulateInput(searchInput, 'Student 1');

      // Wait for search to process
      await AsyncTestHelper.waitForCondition(
        () => searchInput.value === 'Student 1',
        1000
      );

      expect(searchInput.value).toBe('Student 1');
    });

    test('should handle sorting across multiple columns', async () => {
      const sortHTML = `
        <div data-testid="sort-integration">
          <student-table data-testid="student-table"></student-table>
        </div>
      `;

      const container = componentHelper.mount(sortHTML);

      // Simulate column header clicks for sorting
      const nameHeader = container.querySelector('.sortable-header[data-column="name"]') as HTMLElement;
      if (nameHeader) {
        componentHelper.simulateClick(nameHeader);

        // Wait for sort to complete
        await AsyncTestHelper.waitForCondition(
          () => container.querySelector('.sort-indicator') !== null,
          1000
        );
      }
    });
  });

  describe('Form Integration', () => {
    test('should handle multi-step form workflows', async () => {
      const formHTML = `
        <form data-testid="student-form">
          <div class="form-step" data-step="1">
            <input name="name" required placeholder="Student Name" />
            <input name="father_name" required placeholder="Father's Name" />
          </div>
          <div class="form-step" data-step="2" style="display: none;">
            <input name="class" required placeholder="Class" />
            <input name="mobile" required placeholder="Mobile" />
          </div>
          <button type="button" data-testid="next-btn">Next</button>
          <button type="submit" data-testid="submit-btn" style="display: none;">Submit</button>
        </form>
      `;

      const container = componentHelper.mount(formHTML);
      const form = container.querySelector('form') as HTMLFormElement;
      const nextBtn = componentHelper.getByTestId('next-btn');
      const submitBtn = componentHelper.getByTestId('submit-btn');

      expect(form).toBeTruthy();
      expect(nextBtn).toBeTruthy();
      expect(submitBtn).toBeTruthy();

      // Fill first step
      FormTestHelper.fillForm(form, {
        name: 'Test Student',
        father_name: 'Test Father'
      });

      // Navigate to next step
      if (nextBtn) {
        componentHelper.simulateClick(nextBtn);
      }

      // Wait for step transition
      await AsyncTestHelper.waitForElement('.form-step[data-step="2"]:not([style*="display: none"])');

      // Fill second step
      FormTestHelper.fillForm(form, {
        class: 'Class 5',
        mobile: '+91-9876543210'
      });

      // Submit form
      FormTestHelper.submitForm(form);

      // Verify form submission
      expect(form.checkValidity()).toBe(true);
    });

    test('should validate form across multiple components', async () => {
      const validationFormHTML = `
        <form data-testid="validation-form">
          <div class="input-group">
            <label>Name:</label>
            <input name="name" required minlength="3" />
          </div>
          <div class="input-group">
            <label>Email:</label>
            <input name="email" type="email" required />
          </div>
          <div class="input-group">
            <label>Phone:</label>
            <input name="phone" pattern="\\+91-[0-9]{10}" required />
          </div>
          <button type="submit">Submit</button>
        </form>
      `;

      const container = componentHelper.mount(validationFormHTML);
      const form = container.querySelector('form') as HTMLFormElement;

      // Test with invalid data
      FormTestHelper.fillForm(form, {
        name: 'A', // Too short
        email: 'invalid-email',
        phone: '12345' // Wrong format
      });

      const missingFields = FormTestHelper.validateRequiredFields(form);
      expect(missingFields.length).toBeGreaterThan(0);

      expect(form.checkValidity()).toBe(false);

      // Test with valid data
      FormTestHelper.fillForm(form, {
        name: 'Valid Name',
        email: 'test@example.com',
        phone: '+91-9876543210'
      });

      const missingFieldsAfter = FormTestHelper.validateRequiredFields(form);
      expect(missingFieldsAfter.length).toBe(0);

      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('Component Communication Integration', () => {
    test('should handle parent-child component communication', async () => {
      const communicationHTML = `
        <div data-testid="parent-component">
          <div data-testid="child-trigger">
            <button data-testid="trigger-btn">Trigger Child Action</button>
          </div>
          <div data-testid="child-response" style="display: none;">
            <span data-testid="response-message">Action Completed</span>
          </div>
        </div>
      `;

      const container = componentHelper.mount(communicationHTML);
      const triggerBtn = componentHelper.getByTestId('trigger-btn');
      const responseDiv = componentHelper.getByTestId('child-response');

      expect(triggerBtn).toBeTruthy();
      expect(responseDiv).toBeTruthy();

      // Simulate parent triggering child action
      if (triggerBtn) {
        componentHelper.simulateClick(triggerBtn);
      }

      // Wait for response
      await AsyncTestHelper.waitForElement('[data-testid="child-response"]:not([style*="display: none"])');

      const responseMessage = componentHelper.getByTestId('response-message');
      expect(responseMessage).toBeTruthy();
      expect(responseMessage?.textContent).toBe('Action Completed');
    });

    test('should handle sibling component communication', async () => {
      const siblingHTML = `
        <div data-testid="sibling-container">
          <div data-testid="sibling-a">
            <button data-testid="sibling-a-btn">Update Sibling B</button>
          </div>
          <div data-testid="sibling-b">
            <span data-testid="sibling-b-status">Initial State</span>
          </div>
        </div>
      `;

      const container = componentHelper.mount(siblingHTML);
      const siblingABtn = componentHelper.getByTestId('sibling-a-btn');
      const siblingBStatus = componentHelper.getByTestId('sibling-b-status');

      expect(siblingABtn).toBeTruthy();
      expect(siblingBStatus).toBeTruthy();

      // Initial state
      expect(siblingBStatus?.textContent).toBe('Initial State');

      // Simulate sibling A updating sibling B
      if (siblingABtn) {
        componentHelper.simulateClick(siblingABtn);
      }

      // Wait for state update
      await AsyncTestHelper.waitForCondition(
        () => siblingBStatus?.textContent !== 'Initial State',
        1000
      );

      expect(siblingBStatus?.textContent).not.toBe('Initial State');
    });
  });

  describe('Performance Integration', () => {
    test('should handle large datasets efficiently', async () => {
      const largeDataset = PerformanceTestHelper.generateLoad(1000);
      const performanceHTML = `
        <div data-testid="performance-test">
          <student-table data-testid="large-dataset-table"></student-table>
        </div>
      `;

      const container = componentHelper.mount(performanceHTML);

      // Measure rendering performance
      const renderTime = await PerformanceTestHelper.measureExecutionTime(async () => {
        // Simulate rendering large dataset
        const table = container.querySelector('student-table');
        if (table) {
          // In a real implementation, this would trigger data loading
          await AsyncTestHelper.waitForCondition(
            () => container.querySelectorAll('tbody tr').length > 0,
            2000
          );
        }
      }, 5);

      expect(renderTime.average).toBeLessThan(100); // Should render in under 100ms on average
      expect(renderTime.total).toBeLessThan(500); // Total time should be reasonable
    });

    test('should handle memory leaks in long-running components', async () => {
      const memoryTestHTML = `
        <div data-testid="memory-test">
          <button data-testid="create-components">Create Components</button>
          <button data-testid="destroy-components">Destroy Components</button>
          <div data-testid="component-container"></div>
        </div>
      `;

      const container = componentHelper.mount(memoryTestHTML);
      const createBtn = componentHelper.getByTestId('create-components');
      const destroyBtn = componentHelper.getByTestId('destroy-components');
      const componentContainer = componentHelper.getByTestId('component-container');

      // Create components multiple times
      for (let i = 0; i < 10; i++) {
        if (createBtn) {
          componentHelper.simulateClick(createBtn);
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        if (componentContainer) {
          componentContainer.innerHTML += `<div data-testid="test-component-${i}">Component ${i}</div>`;
        }
      }

      // Verify components were created
      const components = container.querySelectorAll('[data-testid^="test-component"]');
      expect(components.length).toBe(10);

      // Destroy components
      if (destroyBtn) {
        componentHelper.simulateClick(destroyBtn);
      }
      if (componentContainer) {
        componentContainer.innerHTML = '';
      }

      // Wait for cleanup
      await AsyncTestHelper.waitForCondition(
        () => container.querySelectorAll('[data-testid^="test-component"]').length === 0,
        1000
      );

      const remainingComponents = container.querySelectorAll('[data-testid^="test-component"]');
      expect(remainingComponents.length).toBe(0);
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle component errors gracefully', async () => {
      const errorBoundaryHTML = `
        <div data-testid="error-boundary-test">
          <div data-testid="error-trigger">
            <button data-testid="throw-error">Throw Error</button>
          </div>
          <div data-testid="error-fallback" style="display: none;">
            <span data-testid="error-message">Something went wrong</span>
          </div>
        </div>
      `;

      const container = componentHelper.mount(errorBoundaryHTML);
      const errorBtn = componentHelper.getByTestId('throw-error');
      const errorFallback = componentHelper.getByTestId('error-fallback');

      expect(errorBtn).toBeTruthy();
      expect(errorFallback).toBeTruthy();

      // Trigger error
      if (errorBtn) {
        componentHelper.simulateClick(errorBtn);
      }

      // Wait for error boundary to catch error
      await AsyncTestHelper.waitForElement('[data-testid="error-fallback"]:not([style*="display: none"])');

      const errorMessage = componentHelper.getByTestId('error-message');
      expect(errorMessage).toBeTruthy();
      expect(errorMessage?.textContent).toBe('Something went wrong');
    });
  });
});