/**
 * Test Utilities for DOM Manipulation
 * Provides reusable utilities for creating, manipulating, and testing DOM elements
 */

import { registerComponent, getComponentRegistry } from './ts/components/registry';

/**
 * Creates a mock DOM element with specified properties
 */
export function createMockElement(tagName: string = 'div', options: {
  className?: string;
  id?: string;
  attributes?: Record<string, string>;
  innerHTML?: string;
  textContent?: string;
} = {}): HTMLElement {
  const element = document.createElement(tagName);

  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  if (options.innerHTML) element.innerHTML = options.innerHTML;
  if (options.textContent) element.textContent = options.textContent;

  return element;
}

/**
 * Creates a mock text node
 */
export function createMockTextNode(text: string = ''): Text {
  return document.createTextNode(text);
}

/**
 * Creates a mock custom element and registers it if needed
 */
export function createMockCustomElement(tagName: string, options: {
  className?: string;
  id?: string;
  attributes?: Record<string, string>;
} = {}): HTMLElement {
  // Register the component if it's in our registry
  const registry = getComponentRegistry();
  const status = registry.getComponentStatus(tagName);

  if (status.registryEntry && !status.registered) {
    registerComponent(tagName);
  }

  return createMockElement(tagName, options);
}

/**
 * Creates a proper DOM fragment for appendChild operations
 */
export function createMockFragment(): DocumentFragment {
  return document.createDocumentFragment();
}

/**
 * Helper to ensure element is properly attached to DOM for appendChild
 */
export function ensureElementInDOM(element: Element, parent: Element = document.body): Element {
  if (!element.parentElement && parent) {
    parent.appendChild(element);
  }
  return element;
}

/**
 * Creates a test container and appends it to the document body
 */
export function createTestContainer(id: string = 'test-container'): HTMLDivElement {
  const container = createMockElement('div', { id });
  document.body.appendChild(container);
  return container as HTMLDivElement;
}

/**
 * Removes a test container from the document body
 */
export function removeTestContainer(id: string = 'test-container'): void {
  const container = document.getElementById(id);
  if (container && container.parentElement) {
    container.parentElement.removeChild(container);
  }
}

/**
 * Creates a mock ShadowRoot for testing
 */
export function createMockShadowRoot(): {
  innerHTML: string;
  getElementById: (id: string) => Element | null;
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => NodeList;
  appendChild: (child: Node) => Node;
  removeChild: (child: Node) => Node;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
} {
  const shadowContainer = createMockElement('div');
  shadowContainer.setAttribute('data-shadow-root', 'true');

  return {
    innerHTML: '',
    getElementById: (id: string) => shadowContainer.querySelector(`#${id}`),
    querySelector: (selector: string) => shadowContainer.querySelector(selector),
    querySelectorAll: (selector: string) => shadowContainer.querySelectorAll(selector),
    appendChild: (child: Node) => shadowContainer.appendChild(child),
    removeChild: (child: Node) => shadowContainer.removeChild(child),
    addEventListener: (type: string, listener: EventListener) => shadowContainer.addEventListener(type, listener),
    removeEventListener: (type: string, listener: EventListener) => shadowContainer.removeEventListener(type, listener),
  };
}

/**
 * Mock HTMLElement class for testing
 */
export class MockHTMLElement {
  private _delegateElement: HTMLElement;
  private _realShadowRoot: any = null;
  public tagName: string;
  public nodeType: number = 1; // ELEMENT_NODE
  public nodeName: string;

  constructor(tagName: string = 'div') {
    this._delegateElement = document.createElement(tagName);
    this.tagName = tagName.toUpperCase();
    this.nodeName = tagName.toUpperCase();

    // Set up shadow root container
    this._shadowContainer = document.createElement('div');
    this._shadowContainer.setAttribute('data-shadow-root', 'true');
  }

  private _shadowContainer: HTMLElement;

  attachShadow(options: ShadowRootInit): any {
    if (!this._realShadowRoot) {
      this._realShadowRoot = this._shadowContainer;
      this._delegateElement.appendChild(this._realShadowRoot);
    }
    return this._realShadowRoot;
  }

  get shadowRoot(): any {
    return this._realShadowRoot;
  }

  set shadowRoot(value: any) {
    this._realShadowRoot = value;
  }

  // Delegate DOM operations to the real element
  get className(): string {
    return this._delegateElement.className;
  }

  set className(value: string) {
    this._delegateElement.className = value;
  }

  get id(): string {
    return this._delegateElement.id;
  }

  set id(value: string) {
    this._delegateElement.id = value;
  }

  get innerHTML(): string {
    return this._delegateElement.innerHTML;
  }

  set innerHTML(value: string) {
    this._delegateElement.innerHTML = value;
  }

  get textContent(): string | null {
    return this._delegateElement.textContent;
  }

  set textContent(value: string | null) {
    this._delegateElement.textContent = value;
  }

  get parentElement(): Element | null {
    return this._delegateElement.parentElement;
  }


  get children(): HTMLCollection {
    return this._delegateElement.children;
  }

  appendChild(child: Node): Node {
    return this._delegateElement.appendChild(child);
  }

  removeChild(child: Node): Node {
    return this._delegateElement.removeChild(child);
  }

  addEventListener(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void {
    return this._delegateElement.addEventListener(type, listener, options);
  }

  dispatchEvent(event: Event): boolean {
    return this._delegateElement.dispatchEvent(event);
  }

  removeEventListener(type: string, listener: EventListener, options?: boolean | EventListenerOptions): void {
    return this._delegateElement.removeEventListener(type, listener, options);
  }

  setAttribute(name: string, value: string): void {
    return this._delegateElement.setAttribute(name, value);
  }

  getAttribute(name: string): string | null {
    return this._delegateElement.getAttribute(name);
  }

  hasAttribute(name: string): boolean {
    return this._delegateElement.hasAttribute(name);
  }

  removeAttribute(name: string): void {
    return this._delegateElement.removeAttribute(name);
  }

  querySelector(selector: string): Element | null {
    return this._delegateElement.querySelector(selector);
  }

  querySelectorAll(selector: string): NodeListOf<Element> {
    return this._delegateElement.querySelectorAll(selector);
  }

  getElementById(id: string): Element | null {
    return this._delegateElement.querySelector(`#${id}`);
  }

  connectedCallback(): void {}
  disconnectedCallback(): void {}
}

/**
 * Test setup utility that registers all components and sets up DOM
 */
export function setupTestEnvironment(): {
  container: HTMLDivElement;
  cleanup: () => void;
} {
  // Register all components
  registerComponent('student-table');
  registerComponent('student-profile-card');
  registerComponent('driver-info');
  registerComponent('chart-component');

  // Create test container
  const container = createTestContainer();

  // Return cleanup function
  const cleanup = () => {
    removeTestContainer(container.id);
  };

  return { container, cleanup };
}

/**
 * Utility to wait for a specified amount of time in tests
 */
export function waitFor(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Utility to trigger a custom event on an element
 */
export function triggerCustomEvent(element: Element, eventName: string, detail?: any): void {
  const event = new CustomEvent(eventName, { detail });
  element.dispatchEvent(event);
}

/**
 * Utility to create mock student data for testing
 */
export function createMockStudentData(count: number = 5): any[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `student-${index + 1}`,
    name: `Student ${index + 1}`,
    father_name: `Father ${index + 1}`,
    class: `Class ${Math.floor(Math.random() * 10) + 1}`,
    mobile: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    address: `Address ${index + 1}, City`,
    route: `Route ${Math.floor(Math.random() * 5) + 1}`,
    fees: `${Math.floor(Math.random() * 5000) + 1000}`,
    status: Math.random() > 0.8 ? 'inactive' : 'active'
  }));
}

/**
 * Utility to create mock driver data for testing
 */
export function createMockDriverData(count: number = 3): any[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Driver ${index + 1}`,
    route: `Route ${index + 1}`,
    vehicle_number: `DL01CA${1000 + index}`,
    mobile: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    license_number: `DL123456789${index}`,
    status: 'active'
  }));
}

/**
 * Utility to create mock chart data for testing
 */
export function createMockChartData(type: 'bar' | 'pie' = 'bar'): any {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const values = [10, 20, 15, 25, 30];

  return {
    type,
    title: 'Test Chart',
    labels,
    values,
    colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
  };
}

/**
 * Enhanced API mocking utilities
 */
export class MockApiService {
  private endpoints: Map<string, any> = new Map();
  private delays: Map<string, number> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks() {
    // Default student endpoints
    this.mockEndpoint('GET', '/api/students', {
      data: createMockStudentData(5),
      total: 5,
      page: 1,
      per_page: 10
    });

    // Default driver endpoints
    this.mockEndpoint('GET', '/api/drivers', {
      data: createMockDriverData(3),
      total: 3
    });

    // Default chart endpoints
    this.mockEndpoint('GET', '/api/charts/data', {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{
        label: 'Students',
        data: [10, 20, 15, 25, 30],
        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
      }]
    });
  }

  mockEndpoint(method: string, url: string, response: any, delay: number = 0) {
    const key = `${method}:${url}`;
    this.endpoints.set(key, response);
    if (delay > 0) {
      this.delays.set(key, delay);
    }
  }

  async mockFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const method = options.method || 'GET';
    const key = `${method}:${url}`;

    const response = this.endpoints.get(key);
    const delay = this.delays.get(key) || 0;

    if (delay > 0) {
      await waitFor(delay);
    }

    if (!response) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
        text: async () => 'Not found'
      } as Response;
    }

    return {
      ok: true,
      status: 200,
      json: async () => response,
      text: async () => JSON.stringify(response)
    } as Response;
  }

  clearMocks() {
    this.endpoints.clear();
    this.delays.clear();
    this.setupDefaultMocks();
  }
}

/**
 * Component testing utilities
 */
export class ComponentTestHelper {
  private container: HTMLDivElement;

  constructor() {
    this.container = createTestContainer('component-test-container');
  }

  mount(componentHTML: string): HTMLElement {
    this.container.innerHTML = componentHTML;
    return this.container.firstElementChild as HTMLElement;
  }

  unmount() {
    this.container.innerHTML = '';
  }

  cleanup() {
    removeTestContainer(this.container.id);
  }

  getByTestId(testId: string): HTMLElement | null {
    return this.container.querySelector(`[data-testid="${testId}"]`);
  }

  getByClass(className: string): HTMLElement | null {
    return this.container.querySelector(`.${className}`);
  }

  getByTag(tagName: string): HTMLElement | null {
    return this.container.querySelector(tagName);
  }

  getAllByClass(className: string): HTMLElement[] {
    return Array.from(this.container.querySelectorAll(`.${className}`));
  }

  simulateEvent(element: HTMLElement, eventName: string, options: any = {}): void {
    const event = new Event(eventName, {
      bubbles: true,
      cancelable: true,
      ...options
    });
    element.dispatchEvent(event);
  }

  simulateClick(element: HTMLElement): void {
    this.simulateEvent(element, 'click');
  }

  simulateInput(element: HTMLInputElement, value: string): void {
    element.value = value;
    this.simulateEvent(element, 'input');
  }
}

/**
 * Form testing utilities
 */
export class FormTestHelper {
  static fillForm(form: HTMLFormElement, data: Record<string, string>): void {
    Object.entries(data).forEach(([name, value]) => {
      const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  static submitForm(form: HTMLFormElement): void {
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
  }

  static getFormData(form: HTMLFormElement): Record<string, string> {
    const formData = new FormData(form);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });
    return data;
  }

  static validateRequiredFields(form: HTMLFormElement): string[] {
    const requiredFields = form.querySelectorAll('[required]');
    const missingFields: string[] = [];

    requiredFields.forEach(field => {
      const input = field as HTMLInputElement;
      if (!input.value.trim()) {
        const name = input.name || input.id || 'unknown';
        missingFields.push(name);
      }
    });

    return missingFields;
  }
}

/**
 * Async testing utilities
 */
export class AsyncTestHelper {
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await waitFor(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async waitForElement(
    selector: string,
    container: HTMLElement = document.body,
    timeout: number = 5000
  ): Promise<HTMLElement> {
    return this.waitForCondition(
      () => container.querySelector(selector) !== null,
      timeout
    ).then(() => container.querySelector(selector) as HTMLElement);
  }

  static async waitForElementToBeRemoved(
    selector: string,
    container: HTMLElement = document.body,
    timeout: number = 5000
  ): Promise<void> {
    return this.waitForCondition(
      () => container.querySelector(selector) === null,
      timeout
    );
  }
}

/**
 * Mock data generators with enhanced options
 */
export function createMockStudentDataWithOptions(count: number = 5, options: {
  includeContactInfo?: boolean;
  includeLocationDetails?: boolean;
  customFields?: Record<string, any>;
} = {}): any[] {
  const { includeContactInfo = false, includeLocationDetails = false, customFields = {} } = options;

  return Array.from({ length: count }, (_, index) => {
    const baseStudent = {
      id: `student-${index + 1}`,
      name: `Student ${index + 1}`,
      father_name: `Father ${index + 1}`,
      class: `Class ${Math.floor(Math.random() * 10) + 1}`,
      mobile: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      address: `Address ${index + 1}, City`,
      route: `Route ${Math.floor(Math.random() * 5) + 1}`,
      fees: `${Math.floor(Math.random() * 5000) + 1000}`,
      status: Math.random() > 0.8 ? 'inactive' : 'active',
      ...customFields
    };

    if (includeContactInfo) {
      baseStudent.contact_info = {
        primary_mobile: baseStudent.mobile,
        secondary_mobile: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        father_contact: `+91-${Math.floor(Math.random() * 9000000000) + 1000000000}`
      };
    }

    if (includeLocationDetails) {
      baseStudent.location_details = {
        route_number: baseStudent.route,
        area: `Area ${index + 1}`,
        full_address: `${baseStudent.address}, Area ${index + 1}, City ${index + 1}`
      };
    }

    return baseStudent;
  });
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
  static async measureExecutionTime<T>(
    fn: () => T | Promise<T>,
    iterations: number = 100
  ): Promise<{ average: number; min: number; max: number; total: number }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      total: times.reduce((a, b) => a + b, 0)
    };
  }

  static generateLoad(count: number): any[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `load-${index}`,
      data: `x`.repeat(1000), // Generate 1KB of data per item
      timestamp: Date.now()
    }));
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTestHelper {
  static checkAriaLabels(element: HTMLElement): boolean {
    const elementsNeedingAria = element.querySelectorAll(
      'button:not([aria-label]):not([aria-labelledby]), ' +
      'input:not([aria-label]):not([aria-labelledby]), ' +
      'select:not([aria-label]):not([aria-labelledby])'
    );

    return elementsNeedingAria.length === 0;
  }

  static checkKeyboardNavigation(element: HTMLElement): boolean {
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    return focusableElements.length > 0;
  }

  static checkColorContrast(foreground: string, background: string): boolean {
    // Simple color contrast check (in a real implementation, you'd use a proper algorithm)
    // This is a placeholder for demonstration
    return true;
  }
}

/**
 * Network mocking utilities
 */
export class NetworkTestHelper {
  private originalFetch: typeof global.fetch;

  constructor() {
    this.originalFetch = global.fetch;
  }

  mockNetworkConditions(conditions: {
    latency?: number;
    bandwidth?: number;
    packetLoss?: number;
  } = {}) {
    const { latency = 0, bandwidth = Infinity, packetLoss = 0 } = conditions;

    global.fetch = async (url: string, options: RequestInit = {}) => {
      // Simulate latency
      if (latency > 0) {
        await waitFor(latency);
      }

      // Simulate packet loss
      if (Math.random() < packetLoss) {
        throw new Error('Network request failed due to packet loss');
      }

      // Simulate bandwidth limitations
      if (bandwidth < Infinity) {
        // This would be more complex in a real implementation
        await waitFor(100); // Simulate slower network
      }

      return this.originalFetch(url, options);
    };
  }

  restoreNetwork() {
    global.fetch = this.originalFetch;
  }

  simulateOffline() {
    global.fetch = async () => {
      throw new Error('Network request failed: offline');
    };
  }

  simulateSlowNetwork() {
    global.fetch = async (url: string, options: RequestInit = {}) => {
      await waitFor(2000); // 2 second delay
      return this.originalFetch(url, options);
    };
  }
}

/**
 * Database mocking utilities for testing
 */
export class MockDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    this.data.set('students', createMockStudentData(10));
    this.data.set('drivers', createMockDriverData(5));
    this.data.set('users', [
      { id: 1, username: 'admin', role: 'admin' },
      { id: 2, username: 'teacher', role: 'teacher' }
    ]);
  }

  async find(table: string, conditions: Record<string, any> = {}): Promise<any[]> {
    const tableData = this.data.get(table) || [];

    if (Object.keys(conditions).length === 0) {
      return [...tableData];
    }

    return tableData.filter(item =>
      Object.entries(conditions).every(([key, value]) =>
        item[key] === value
      )
    );
  }

  async findOne(table: string, conditions: Record<string, any> = {}): Promise<any | null> {
    const results = await this.find(table, conditions);
    return results.length > 0 ? results[0] : null;
  }

  async create(table: string, data: any): Promise<any> {
    const tableData = this.data.get(table) || [];
    const newItem = {
      id: Date.now().toString(),
      ...data,
      created_at: new Date().toISOString()
    };

    tableData.push(newItem);
    this.data.set(table, tableData);
    return newItem;
  }

  async update(table: string, id: string, data: any): Promise<any | null> {
    const tableData = this.data.get(table) || [];
    const index = tableData.findIndex(item => item.id === id);

    if (index === -1) {
      return null;
    }

    tableData[index] = { ...tableData[index], ...data, updated_at: new Date().toISOString() };
    this.data.set(table, tableData);
    return tableData[index];
  }

  async delete(table: string, id: string): Promise<boolean> {
    const tableData = this.data.get(table) || [];
    const index = tableData.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    tableData.splice(index, 1);
    this.data.set(table, tableData);
    return true;
  }

  clear() {
    this.data.clear();
    this.initializeDefaultData();
  }
}