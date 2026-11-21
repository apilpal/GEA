// Polyfill TextEncoder and TextDecoder before importing jsdom
const { TextEncoder, TextDecoder } = require('util');

// Polyfill TextEncoder and TextDecoder for jsdom
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Install canvas package for jsdom canvas support
const canvas = require('canvas');
const { createCanvas, loadImage } = canvas;

// Mock canvas for jsdom
global.HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    const canvas = createCanvas(this.width || 800, this.height || 600);
    return canvas.getContext('2d');
  }
  return null;
};

const { JSDOM } = require('jsdom');

// Setup JSDOM with custom elements support
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:5173',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Mock Custom Elements API
global.customElements = {
  define: jest.fn(),
  get: jest.fn(),
  whenDefined: jest.fn().mockResolvedValue(undefined)
};

// Mock classes for testing
global.MockStudentTable = class MockStudentTable extends global.HTMLElement {
  constructor() {
    super();
    this.students = [];
    this.originalStudents = [];
    this.sortColumn = null;
    this.sortAscending = true;
    this.searchTerm = '';
    this.attachShadow({ mode: 'open' });
  }

  setStudents(students) {
    if (!Array.isArray(students)) {
      throw new Error('students is not iterable');
    }
    this.originalStudents = [...students];
    this.students = [...students];
    this.render();
    this.updateTotalCount(); // Ensure count is updated immediately after setting students
  }

  getStudents() {
    return this.students;
  }

  render() {
    const shadow = this.shadowRoot;
    shadow.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>Total Students: <span id="total-count">${this.students.length}</span></h2>
          <div class="search-container">
            <input type="text" id="search-input" placeholder="Search students..." class="search-input">
            <button id="clear-search" style="display: none;">✕</button>
          </div>
          <button id="add-student-btn" class="add-student-btn">+ Add Student</button>
        </div>
        <table class="student-table">
          <thead>
            <tr>
              <th>Status</th>
              <th class="sortable-header" data-column="route">Route</th>
              <th class="sortable-header" data-column="name">Name</th>
              <th class="sortable-header" data-column="father_name">Father's Name</th>
              <th class="sortable-header" data-column="class">Class</th>
              <th class="sortable-header" data-column="mobile">Mobile</th>
              <th class="sortable-header" data-column="address">Address</th>
              <th class="sortable-header" data-column="fees">Fees</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="table-body">
            ${this.renderTableRows()}
          </tbody>
        </table>
      </div>
    `;
    this.updateTotalCount(); // Ensure count is updated after render
  }

  renderTableRows() {
    return this.students.map((student, index) => `
      <tr class="student-row" data-index="${index}">
        <td>
          <span class="status-indicator ${student.status || 'active'}">
            ${student.status === 'inactive' ? 'Inactive' : 'Active'}
          </span>
        </td>
        <td>${student.route || 'N/A'}</td>
        <td>${student.name || 'N/A'}</td>
        <td>${student.father_name || 'N/A'}</td>
        <td>${student.class || 'N/A'}</td>
        <td>${student.mobile || 'N/A'}</td>
        <td>${student.address || 'N/A'}</td>
        <td>${student.fees ? `₹${student.fees}` : 'N/A'}</td>
        <td class="actions-cell">
          <button class="action-btn view-btn" data-action="view" data-index="${index}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="edit" data-index="${index}" title="Edit Student">✏️</button>
          <button class="action-btn delete-btn" data-action="delete" data-index="${index}" title="Delete Student">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  filterStudents(searchTerm) {
    this.searchTerm = searchTerm || '';
    if (!this.searchTerm) {
      this.students = [...this.originalStudents];
    } else {
      this.students = this.originalStudents.filter(student => {
        var _a, _b, _c, _d, _e, _f, _g;
        return ((_a = student.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          ((_b = student.father_name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          ((_c = student.class) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          ((_d = student.mobile) === null || _d === void 0 ? void 0 : _d.includes(this.searchTerm)) ||
          ((_e = student.address) === null || _e === void 0 ? void 0 : _e.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          ((_f = student.route) === null || _f === void 0 ? void 0 : _f.toLowerCase().includes(this.searchTerm.toLowerCase())) ||
          ((_g = student.fees) === null || _g === void 0 ? void 0 : _g.includes(this.searchTerm));
      });
    }
    this.updateTableBody();
    this.updateTotalCount();
    return this.students;
  }

  sortTable(column, ascending = true) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = ascending;
    }
    this.students.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return this.sortAscending ? 1 : -1;
      if (bValue == null) return this.sortAscending ? -1 : 1;
      aValue = aValue.toString().toLowerCase();
      bValue = bValue.toString().toLowerCase();
      if (aValue < bValue) return this.sortAscending ? -1 : 1;
      if (aValue > bValue) return this.sortAscending ? 1 : -1;
      return 0;
    });
    this.updateTableBody();
  }

  updateTableBody() {
    const tbody = this.shadowRoot.getElementById('table-body');
    tbody.innerHTML = this.renderTableRows();
  }

  updateTotalCount() {
    const countElement = this.shadowRoot.getElementById('total-count');
    countElement.textContent = this.students.length.toString();
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    // Cleanup if needed
  }
};

global.MockStudentProfileCard = class MockStudentProfileCard extends global.HTMLElement {
  constructor() {
    super();
    this.student = null;
    this.attachShadow({ mode: 'open' });
  }

  setStudent(student) {
    this.student = student;
    this.render();
  }

  getStudent() {
    return this.student;
  }

  render() {
    const shadow = this.shadowRoot;
    if (!this.student) {
      shadow.innerHTML = '<p>No student data available</p>';
      return;
    }
    if (!this.student.name) {
      // Handle empty student object gracefully
      shadow.innerHTML = '<p>No student data available</p>';
      return;
    }
    const contactInfo = this.student.contact_info || {};
    const locationDetails = this.student.location_details || {};
    shadow.innerHTML = `
      <div class="profile-card">
        <div class="profile-header">
          <div class="student-avatar">${this.student.name.charAt(0).toUpperCase()}</div>
          <div class="student-name-section">
            <h2>${this.student.name}</h2>
            <p class="student-route">Route: ${this.student.route || 'N/A'}</p>
          </div>
        </div>
        <div class="profile-details-grid">
          <div class="detail-card basic-info">
            <h3>Basic Information</h3>
            <p><strong>Father's Name:</strong> ${this.student.father_name || 'N/A'}</p>
            <p><strong>Class:</strong> ${this.student.class || 'N/A'}</p>
            <p><strong>Fees:</strong> ${this.student.fees ? `₹${this.student.fees}` : 'N/A'}</p>
          </div>
          <div class="detail-card contact-info">
            <h3>Contact Details</h3>
            <p><strong>Primary Mobile:</strong> ${contactInfo.primary_mobile || this.student.mobile || 'N/A'}</p>
            ${contactInfo.secondary_mobile ? `<p><strong>Secondary Mobile:</strong> ${contactInfo.secondary_mobile}</p>` : ''}
            <p><strong>Father Contact:</strong> ${contactInfo.father_contact || 'N/A'}</p>
          </div>
          <div class="detail-card location-info">
            <h3>Location Details</h3>
            <p><strong>Route Number:</strong> ${locationDetails.route_number || this.student.route || 'N/A'}</p>
            <p><strong>Area:</strong> ${locationDetails.area || 'N/A'}</p>
            <p><strong>Full Address:</strong> ${locationDetails.full_address || this.student.address || 'N/A'}</p>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    // Cleanup if needed
  }
};

global.MockDriverInfo = class MockDriverInfo extends global.HTMLElement {
    constructor() {
        super();
        this.driver = null;
        this.studentCount = 0;
        this.attachShadow({ mode: 'open' });
    }

    setDriver(driver) {
        this.driver = driver;
        this.render();
    }

    setStudentCount(count) {
        this.studentCount = count;
        this.render();
    }

    getDriver() {
        return this.driver;
    }

    getStudentCount() {
        return this.studentCount;
    }

    render() {
        const shadow = this.shadowRoot;
        let driverName = 'Unknown';
        if (this.driver && typeof this.driver === 'string') {
            driverName = this.driver.charAt(0).toUpperCase() + this.driver.slice(1);
        } else if (this.driver && this.driver.name) {
            driverName = this.driver.name.charAt(0).toUpperCase() + this.driver.name.slice(1);
        }
        shadow.innerHTML = `
            <div class="driver-info-card">
                <div class="driver-header">
                    <div class="driver-avatar">${driverName.charAt(0)}</div>
                    <div class="driver-details">
                        <h3>${driverName} Driver</h3>
                        <p class="student-count">${this.studentCount} Students</p>
                    </div>
                </div>
                <div class="driver-stats">
                    <div class="stat-item">
                        <span class="stat-label">Route:</span>
                        <span class="stat-value">${this.driver || 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value status-active">Active</span>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.render();
    }

    disconnectedCallback() {
        // Cleanup if needed
    }
};

global.MockChartComponent = class MockChartComponent extends global.HTMLElement {
    constructor() {
        super();
        this.data = null;
        this.canvas = null;
        this.ctx = null;
        this.attachShadow({ mode: 'open' });
    }

    setData(data) {
        this.data = data;
        this.render();
        this.drawChart();
    }

    getData() {
        return this.data;
    }

    render() {
        const shadow = this.shadowRoot;
        shadow.innerHTML = `
            <div class="chart-container">
                <div class="chart-header">
                    <h3>${this.data?.title || 'Chart'}</h3>
                </div>
                <div class="chart-content">
                    <canvas class="chart-canvas"></canvas>
                </div>
            </div>
        `;
        this.setupCanvas();
    }

    setupCanvas() {
        const shadow = this.shadowRoot;
        this.canvas = shadow.querySelector('.chart-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        }
    }

    drawChart() {
        if (!this.data || !this.ctx || !this.canvas) return;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.data.type === 'bar') {
            this.drawBarChart();
        } else if (this.data.type === 'pie') {
            this.drawPieChart();
        }
    }

    drawBarChart() {
        if (!this.data || !this.ctx || !this.canvas) return;

        const { labels, values, colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c'] } = this.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const maxValue = Math.max(...values);
        const barWidth = chartWidth / labels.length * 0.8;
        const spacing = chartWidth / labels.length * 0.2;

        // Draw bars
        labels.forEach((label, index) => {
            const value = values[index];
            const barHeight = (value / maxValue) * chartHeight;
            const x = padding + index * (barWidth + spacing);
            const y = height - padding - barHeight;

            // Draw bar
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fillRect(x, y, barWidth, barHeight);

            // Draw border
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, barWidth, barHeight);

            // Draw label
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label, x + barWidth / 2, height - padding / 2);

            // Draw value
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
        });

        // Draw axes
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, height - padding);
        this.ctx.stroke();
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(padding, height - padding);
        this.ctx.lineTo(width - padding, height - padding);
        this.ctx.stroke();
    }

    drawPieChart() {
        if (!this.data || !this.ctx || !this.canvas) return;

        const { labels, values, colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'] } = this.data;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.max(10, Math.min(centerX, centerY) - 40); // Ensure minimum radius

        const total = values.reduce((sum, value) => sum + value, 0);
        if (total === 0) return; // Avoid division by zero

        let startAngle = 0;

        // Draw pie slices
        labels.forEach((label, index) => {
            const value = values[index];
            const sliceAngle = (value / total) * 2 * Math.PI;

            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            this.ctx.closePath();
            this.ctx.fill();

            // Draw border
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Calculate label position
            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 20);

            // Draw label
            this.ctx.fillStyle = '#333';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label, labelX, labelY);

            // Draw percentage
            const percentage = ((value / total) * 100).toFixed(1);
            this.ctx.fillText(`${percentage}%`, labelX, labelY + 15);

            startAngle += sliceAngle;
        });

        // Draw center circle for donut effect (optional)
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, Math.max(5, radius * 0.3), 0, 2 * Math.PI); // Ensure minimum inner radius
        this.ctx.fill();
    }

    connectedCallback() {
        this.render();
        this.setupCanvas();
    }

    disconnectedCallback() {
        // Cleanup if needed
    }
};

// Mock customElements.define for tests
global.mockCustomElements = {
  define: jest.fn(),
  get: jest.fn(),
  whenDefined: jest.fn().mockResolvedValue(undefined)
};

// Custom element isolation utilities
global.customElementRegistry = new Map();

// Clear all custom element registrations
global.clearCustomElementRegistry = function() {
  for (const [name] of global.customElementRegistry) {
    try {
      global.customElements.define(name, class extends HTMLElement {});
    } catch (e) {
      // Ignore errors if already defined
    }
  }
  global.customElementRegistry.clear();
  // Clear the mocks if they exist
  if (global.customElements.define.mockClear) {
    global.customElements.define.mockClear();
  }
  if (global.customElements.get.mockClear) {
    global.customElements.get.mockClear();
  }
};

// Safely register a custom element for testing
global.registerTestCustomElement = function(name, constructor) {
  try {
    global.customElements.define(name, constructor);
    global.customElementRegistry.set(name, constructor);
  } catch (e) {
    if (e.name === 'NotSupportedError' || e.name === 'InvalidStateError') {
      // Element already defined or registry is in an invalid state, skip registration
      console.warn(`Custom element ${name} already registered, skipping.`);
    } else {
      throw e;
    }
  }
};

// Register actual custom element constructors for testing
global.registerTestCustomElement('student-table', global.MockStudentTable);
global.registerTestCustomElement('student-profile-card', global.MockStudentProfileCard);
global.registerTestCustomElement('driver-info', global.MockDriverInfo);
global.registerTestCustomElement('chart-component', global.MockChartComponent);

// Mock HTMLElement constructor that properly implements HTMLElement interface
class MockHTMLElement {
  constructor(tagName = 'div') {
    // Create a real element to delegate DOM operations
    this._delegateElement = document.createElement(tagName);
    this._realShadowRoot = null;
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1; // ELEMENT_NODE
    this.nodeName = tagName.toUpperCase();

    // Set up shadow root container
    this._shadowContainer = document.createElement('div');
    this._shadowContainer.setAttribute('data-shadow-root', 'true');

    // Initialize shadow root
    this.attachShadow({ mode: 'open' });
  }

  attachShadow(options) {
    if (!this._realShadowRoot) {
      this._realShadowRoot = this._shadowContainer;
      // Ensure shadow root is properly attached to delegate element
      if (this._delegateElement && this._shadowContainer) {
        this._delegateElement.appendChild(this._shadowContainer);
      }
    }
    return this._realShadowRoot;
  }

  // Delegate all DOM operations to the real element
  get shadowRoot() {
    return this._realShadowRoot;
  }

  set shadowRoot(value) {
    this._realShadowRoot = value;
  }

  // Delegate other HTMLElement properties and methods to the real element
  get className() {
    return this._delegateElement.className;
  }

  set className(value) {
    this._delegateElement.className = value;
  }

  get id() {
    return this._delegateElement.id;
  }

  set id(value) {
    this._delegateElement.id = value;
  }

  get innerHTML() {
    return this._delegateElement.innerHTML;
  }

  set innerHTML(value) {
    this._delegateElement.innerHTML = value;
  }

  get textContent() {
    return this._delegateElement.textContent;
  }

  set textContent(value) {
    this._delegateElement.textContent = value;
  }

  get parentElement() {
    return this._delegateElement.parentElement;
  }

  set parentElement(value) {
    this._delegateElement.parentElement = value;
  }

  get children() {
    return this._delegateElement.children;
  }

  appendChild(child) {
    // Handle shadow root appendChild operations
    if (this._realShadowRoot && child && child.getAttribute && child.getAttribute('data-shadow-root')) {
      // If appending shadow root, just return it
      return child;
    }
    return this._delegateElement.appendChild(child);
  }

  removeChild(child) {
    return this._delegateElement.removeChild(child);
  }

  addEventListener(type, listener, options) {
    return this._delegateElement.addEventListener(type, listener, options);
  }

  dispatchEvent(event) {
    return this._delegateElement.dispatchEvent(event);
  }

  removeEventListener(type, listener, options) {
    return this._delegateElement.removeEventListener(type, listener, options);
  }

  setAttribute(name, value) {
    return this._delegateElement.setAttribute(name, value);
  }

  getAttribute(name) {
    return this._delegateElement.getAttribute(name);
  }

  hasAttribute(name) {
    return this._delegateElement.hasAttribute(name);
  }

  removeAttribute(name) {
    return this._delegateElement.removeAttribute(name);
  }

  querySelector(selector) {
    return this._delegateElement.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this._delegateElement.querySelectorAll(selector);
  }

  getElementById(id) {
    return this._delegateElement.querySelector(`#${id}`);
  }

  connectedCallback() {}
  disconnectedCallback() {}
}

// Ensure it properly extends the real HTMLElement if available
if (typeof HTMLElement !== 'undefined') {
  MockHTMLElement.prototype = Object.create(HTMLElement.prototype);
}

global.HTMLElement = MockHTMLElement;

// Mock fetch globally
global.fetch = jest.fn();

// Mock service worker API
Object.defineProperty(global.navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({}),
    ready: Promise.resolve(),
    controller: null,
    oncontrollerchange: null,
    onmessage: null
  },
  writable: true,
  configurable: true
});

// Mock matchMedia for responsive design testing
Object.defineProperty(global.window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for responsive design testing
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock import.meta for ES modules support
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      url: 'http://localhost:5173',
      resolve: jest.fn(),
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:8000/api',
        VITE_API_TIMEOUT: '10000',
        VITE_APP_NAME: 'School Management System',
        VITE_APP_VERSION: '1.0.0',
        VITE_APP_ENV: 'test',
        VITE_AUTH_REFRESH_THRESHOLD: '517300',
        VITE_ENABLE_DEBUG_MODE: 'false',
        VITE_ENABLE_ANALYTICS: 'false',
        VITE_ENABLE_ERROR_REPORTING: 'false',
        VITE_DEFAULT_THEME: 'light',
        VITE_ENABLE_DARK_MODE: 'true',
        VITE_ENABLE_SERVICE_WORKER: 'false',
        VITE_CACHE_EXPIRY: '3600000',
        VITE_API_RATE_LIMIT: '100',
        VITE_API_RATE_WINDOW: '60000'
      }
    }
  },
  writable: true,
  configurable: true
});

// Setup global test lifecycle hooks
beforeEach(() => {
  // Clear custom element registry before each test
  global.clearCustomElementRegistry();

  // Reset console mocks
  global.console.log.mockClear();
  global.console.error.mockClear();
  global.console.warn.mockClear();
  global.console.info.mockClear();

  // Reset fetch mock
  if (global.fetch) {
    global.fetch.mockClear();
  }

  // Clear localStorage and sessionStorage mocks
  if (global.window.localStorage) {
    global.window.localStorage.clear();
  }
  if (global.window.sessionStorage) {
    global.window.sessionStorage.clear();
  }

  // Reset ResizeObserver mock
  if (global.ResizeObserver) {
    global.ResizeObserver.mockClear();
  }

  // Reset IntersectionObserver mock
  if (global.IntersectionObserver) {
    global.IntersectionObserver.mockClear();
  }

  // Reset matchMedia mock
  if (global.window.matchMedia) {
    global.window.matchMedia.mockClear();
  }
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Utility functions for creating proper DOM node mocks
global.createMockElement = function(tagName = 'div', options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  return element;
};

global.createMockTextNode = function(text = '') {
  return document.createTextNode(text);
};

global.createMockCustomElement = function(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  return element;
};

// Utility to create a proper DOM fragment for appendChild operations
global.createMockFragment = function() {
  return document.createDocumentFragment();
};

// Helper to ensure element is properly attached to DOM for appendChild
global.ensureElementInDOM = function(element, parent = document.body) {
  if (!element.parentElement && parent) {
    parent.appendChild(element);
  }
  return element;
};