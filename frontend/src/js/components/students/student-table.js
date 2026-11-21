import { BaseComponent } from '@/ts/components/core/index';
class StudentTable extends BaseComponent {
    constructor() {
        super();
        this.students = [];
        this.originalStudents = [];
        this.sortColumn = null;
        this.sortAscending = true;
        this.searchTerm = '';
        this.searchTimeout = null;
        this.isMobile = false;
        this.mediaQuery = null;
        this.initializeMediaQuery();
    }
    connectedCallback() {
        super.connectedCallback();
        this.checkScreenSize();
    }
    disconnectedCallback() {
        this.removeEventListeners();
        if (this.mediaQuery) {
            this.mediaQuery.removeEventListener('change', this.handleScreenSizeChange.bind(this));
        }
    }
    setStudents(students) {
        const newStudents = [...students];
        const newOriginalStudents = [...students];
        if (JSON.stringify(this.originalStudents) === JSON.stringify(newOriginalStudents) &&
            JSON.stringify(this.students) === JSON.stringify(newStudents)) {
            return;
        }
        this.originalStudents = newOriginalStudents;
        this.students = newStudents;
        this.markForRender();
    }
    render() {
        if (this.isMobile) {
            this.renderCards();
        }
        else if (this.students.length > 100) {
            this.renderLazy();
        }
        else {
            this.renderFull();
        }
    }
    renderLazy() {
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
                <div class="virtual-table-container" style="height: 600px; overflow: auto;">
                    <table class="student-table" role="table" aria-label="Student records table" aria-rowcount="${this.students.length + 1}">
                        <caption class="sr-only">Table displaying student records with columns for serial number, status, route, name, father's name, class, mobile, address, fees, and actions</caption>
                        <thead class="sticky-header">
                            <tr role="row">
                                <th role="columnheader" scope="col" aria-label="Serial Number">Sr No</th>
                                <th role="columnheader" scope="col" aria-label="Student Status">Status</th>
                                <th class="sortable-header" data-column="route" role="columnheader" scope="col" aria-label="Route (clickable to sort)" tabindex="0" aria-sort="none">Route</th>
                                <th class="sortable-header" data-column="name" role="columnheader" scope="col" aria-label="Student Name (clickable to sort)" tabindex="0" aria-sort="none">Name</th>
                                <th class="sortable-header" data-column="father_name" role="columnheader" scope="col" aria-label="Father's Name (clickable to sort)" tabindex="0" aria-sort="none">Father's Name</th>
                                <th class="sortable-header" data-column="class" role="columnheader" scope="col" aria-label="Class (clickable to sort)" tabindex="0" aria-sort="none">Class</th>
                                <th class="sortable-header" data-column="mobile" role="columnheader" scope="col" aria-label="Mobile Number (clickable to sort)" tabindex="0" aria-sort="none">Mobile</th>
                                <th class="sortable-header" data-column="address" role="columnheader" scope="col" aria-label="Address (clickable to sort)" tabindex="0" aria-sort="none" title="Click to sort by address">Address</th>
                                <th class="sortable-header" data-column="fees" role="columnheader" scope="col" aria-label="Fees (clickable to sort)" tabindex="0" aria-sort="none">Fees</th>
                                <th role="columnheader" scope="col" aria-label="Actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="table-body" role="rowgroup">
                            ${this.renderVisibleRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    renderVisibleRows() {
        const visibleStudents = this.students.slice(0, 50);
        return visibleStudents.map((student, index) => `
            <tr class="student-row" data-index="${index}" role="row" tabindex="${index === 0 ? '0' : '-1'}" aria-rowindex="${index + 2}" aria-label="Student ${student.name || 'Unknown'}">
                <td role="gridcell" aria-label="Row ${index + 1}">${index + 1}</td>
                <td role="gridcell" aria-label="Status: ${student.status === 'inactive' ? 'Inactive' : 'Active'}">
                    <span class="status-indicator ${student.status || 'active'}" aria-hidden="true">
                        ${student.status === 'inactive' ? 'Inactive' : 'Active'}
                    </span>
                </td>
                <td role="gridcell" aria-label="Route: ${student.route || 'N/A'}">${student.route || 'N/A'}</td>
                <td role="gridcell" aria-label="Name: ${student.name || 'N/A'}">${student.name || 'N/A'}</td>
                <td role="gridcell" aria-label="Father's Name: ${student.father_name || 'N/A'}">${student.father_name || 'N/A'}</td>
                <td role="gridcell" aria-label="Class: ${student.class || 'N/A'}">${student.class || 'N/A'}</td>
                <td role="gridcell" aria-label="Mobile: ${student.mobile || 'N/A'}">${student.mobile || 'N/A'}</td>
                <td role="gridcell" aria-label="Address: ${student.address || 'N/A'}" title="${student.address || ''}">${student.address ? (student.address.length > 30 ? student.address.substring(0, 27) + '...' : student.address) : 'N/A'}</td>
                <td role="gridcell" aria-label="Fees: ${student.fees ? `₹${student.fees}` : 'N/A'}">${student.fees ? `₹${student.fees}` : 'N/A'}</td>
                <td class="actions-cell" role="gridcell" aria-label="Actions for ${student.name || 'Unknown'}">
                    <button class="action-btn view-btn" data-action="view" data-index="${index}" aria-label="View details for ${student.name}" title="View Details">
                        <icon-eye size="16"></icon-eye>
                        <span class="sr-only">View</span>
                    </button>
                    <button class="action-btn edit-btn" data-action="edit" data-index="${index}" aria-label="Edit ${student.name}" title="Edit Student">
                        <icon-edit size="16"></icon-edit>
                        <span class="sr-only">Edit</span>
                    </button>
                    <button class="action-btn delete-btn" data-action="delete" data-index="${index}" aria-label="Delete ${student.name}" title="Delete Student">
                        <icon-trash size="16"></icon-trash>
                        <span class="sr-only">Delete</span>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    renderCards() {
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
                <div class="student-cards" id="student-cards" role="list" aria-label="Student records">
                    ${this.renderStudentCards()}
                </div>
            </div>
        `;
    }
    renderFull() {
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
                 <table class="student-table" role="table" aria-label="Student records table" aria-rowcount="${this.students.length + 1}">
                     <caption class="sr-only">Table displaying student records with columns for serial number, status, route, name, father's name, class, mobile, address, fees, and actions</caption>
                     <thead>
                         <tr role="row">
                             <th role="columnheader" scope="col" aria-label="Serial Number">Sr No</th>
                             <th role="columnheader" scope="col" aria-label="Student Status">Status</th>
                             <th class="sortable-header" data-column="route" role="columnheader" scope="col" aria-label="Route (clickable to sort)" tabindex="0" aria-sort="none">Route</th>
                             <th class="sortable-header" data-column="name" role="columnheader" scope="col" aria-label="Student Name (clickable to sort)" tabindex="0" aria-sort="none">Name</th>
                             <th class="sortable-header" data-column="father_name" role="columnheader" scope="col" aria-label="Father's Name (clickable to sort)" tabindex="0" aria-sort="none">Father's Name</th>
                             <th class="sortable-header" data-column="class" role="columnheader" scope="col" aria-label="Class (clickable to sort)" tabindex="0" aria-sort="none">Class</th>
                             <th class="sortable-header" data-column="mobile" role="columnheader" scope="col" aria-label="Mobile Number (clickable to sort)" tabindex="0" aria-sort="none">Mobile</th>
                             <th class="sortable-header" data-column="address" role="columnheader" scope="col" aria-label="Address (clickable to sort)" tabindex="0" aria-sort="none" title="Click to sort by address">Address</th>
                             <th class="sortable-header" data-column="fees" role="columnheader" scope="col" aria-label="Fees (clickable to sort)" tabindex="0" aria-sort="none">Fees</th>
                             <th role="columnheader" scope="col" aria-label="Actions">Actions</th>
                         </tr>
                     </thead>
                     <tbody id="table-body" role="rowgroup">
                         ${this.renderTableRows()}
                     </tbody>
                 </table>
             </div>
         `;
    }
    renderStudentCards() {
        return this.students.map((student, index) => `
            <div class="student-card" data-index="${index}" role="listitem" tabindex="${index === 0 ? '0' : '-1'}" aria-label="Student ${student.name || 'Unknown'}">
                <div class="card-header">
                    <div class="card-title">
                        <h3>${student.name || 'N/A'}</h3>
                        <span class="status-indicator ${student.status || 'active'}" aria-label="Status: ${student.status === 'inactive' ? 'Inactive' : 'Active'}">
                            ${student.status === 'inactive' ? 'Inactive' : 'Active'}
                        </span>
                    </div>
                    <div class="card-actions" role="group" aria-label="Actions for ${student.name || 'Unknown'}">
                        <button class="action-btn view-btn" data-action="view" data-index="${index}" aria-label="View details for ${student.name}" title="View Details">
                            <icon-eye size="18"></icon-eye>
                            <span class="sr-only">View</span>
                        </button>
                        <button class="action-btn edit-btn" data-action="edit" data-index="${index}" aria-label="Edit ${student.name}" title="Edit Student">
                            <icon-edit size="18"></icon-edit>
                            <span class="sr-only">Edit</span>
                        </button>
                        <button class="action-btn delete-btn" data-action="delete" data-index="${index}" aria-label="Delete ${student.name}" title="Delete Student">
                            <icon-trash size="18"></icon-trash>
                            <span class="sr-only">Delete</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <div class="info-item">
                            <span class="label">Route:</span>
                            <span class="value">${student.route || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Father's Name:</span>
                            <span class="value">${student.father_name || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Class:</span>
                            <span class="value">${student.class || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Mobile:</span>
                            <span class="value">${student.mobile || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Address:</span>
                            <span class="value" title="${student.address || ''}">${student.address ? (student.address.length > 50 ? student.address.substring(0, 47) + '...' : student.address) : 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Fees:</span>
                            <span class="value">${student.fees ? `₹${student.fees}` : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    renderTableRows() {
        return this.students.map((student, index) => `
             <tr class="student-row" data-index="${index}" role="row" tabindex="${index === 0 ? '0' : '-1'}" aria-rowindex="${index + 2}" aria-label="Student ${student.name || 'Unknown'}">
                 <td role="gridcell" aria-label="Row ${index + 1}">${index + 1}</td>
                 <td role="gridcell" aria-label="Status: ${student.status === 'inactive' ? 'Inactive' : 'Active'}">
                     <span class="status-indicator ${student.status || 'active'}" aria-hidden="true">
                         ${student.status === 'inactive' ? 'Inactive' : 'Active'}
                     </span>
                 </td>
                 <td role="gridcell" aria-label="Route: ${student.route || 'N/A'}">${student.route || 'N/A'}</td>
                 <td role="gridcell" aria-label="Name: ${student.name || 'N/A'}">${student.name || 'N/A'}</td>
                 <td role="gridcell" aria-label="Father's Name: ${student.father_name || 'N/A'}">${student.father_name || 'N/A'}</td>
                 <td role="gridcell" aria-label="Class: ${student.class || 'N/A'}">${student.class || 'N/A'}</td>
                 <td role="gridcell" aria-label="Mobile: ${student.mobile || 'N/A'}">${student.mobile || 'N/A'}</td>
                 <td role="gridcell" aria-label="Address: ${student.address || 'N/A'}" title="${student.address || ''}">${student.address ? (student.address.length > 30 ? student.address.substring(0, 27) + '...' : student.address) : 'N/A'}</td>
                 <td role="gridcell" aria-label="Fees: ${student.fees ? `₹${student.fees}` : 'N/A'}">${student.fees ? `₹${student.fees}` : 'N/A'}</td>
                 <td class="actions-cell" role="gridcell" aria-label="Actions for ${student.name || 'Unknown'}">
                     <button class="action-btn view-btn" data-action="view" data-index="${index}" aria-label="View details for ${student.name}" title="View Details">
                         <icon-eye size="16"></icon-eye>
                         <span class="sr-only">View</span>
                     </button>
                     <button class="action-btn edit-btn" data-action="edit" data-index="${index}" aria-label="Edit ${student.name}" title="Edit Student">
                         <icon-edit size="16"></icon-edit>
                         <span class="sr-only">Edit</span>
                     </button>
                     <button class="action-btn delete-btn" data-action="delete" data-index="${index}" aria-label="Delete ${student.name}" title="Delete Student">
                         <icon-trash size="16"></icon-trash>
                         <span class="sr-only">Delete</span>
                     </button>
                 </td>
             </tr>
         `).join('');
    }
    setupEventListeners() {
        const shadow = this.shadowRoot;
        const searchInput = shadow.getElementById('search-input');
        const clearButton = shadow.getElementById('clear-search');
        let searchTimeout;
        let lastSearchValue = '';
        searchInput?.addEventListener('input', () => {
            const currentValue = searchInput.value;
            if (currentValue === lastSearchValue)
                return;
            lastSearchValue = currentValue;
            clearTimeout(searchTimeout);
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    searchTimeout = setTimeout(() => {
                        this.searchTerm = currentValue;
                        this.filterStudents();
                    }, 300);
                });
            }
            else {
                searchTimeout = setTimeout(() => {
                    this.searchTerm = currentValue;
                    this.filterStudents();
                }, 300);
            }
        });
        searchInput?.addEventListener('input', () => {
            queueMicrotask(() => {
                if (clearButton) {
                    clearButton.style.display = searchInput.value ? 'block' : 'none';
                }
            });
        });
        clearButton?.addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            requestAnimationFrame(() => {
                this.filterStudents();
            });
        });
        shadow.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.target.dataset.column;
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => {
                        this.sortTable(column);
                    });
                }
                else {
                    setTimeout(() => {
                        this.sortTable(column);
                    }, 0);
                }
            });
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const column = e.target.dataset.column;
                    this.sortTable(column);
                }
            });
        });
        const addBtn = shadow.getElementById('add-student-btn');
        addBtn?.addEventListener('click', () => {
            queueMicrotask(() => {
                this.dispatchEvent(new CustomEvent('add-student', { bubbles: true, composed: true }));
            });
        });
        shadow.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('action-btn')) {
                e.stopPropagation();
                requestAnimationFrame(() => {
                    const action = target.dataset.action;
                    const index = parseInt(target.dataset.index);
                    this.dispatchEvent(new CustomEvent('student-action', {
                        bubbles: true,
                        composed: true,
                        detail: { action, index }
                    }));
                });
            }
        });
        if (this.isMobile) {
            shadow.addEventListener('click', (e) => {
                const target = e.target;
                const card = target.closest('.student-card');
                if (card && !target.classList.contains('action-btn')) {
                    const index = parseInt(card.dataset.index);
                    this.dispatchEvent(new CustomEvent('student-card-selected', {
                        bubbles: true,
                        composed: true,
                        detail: { index }
                    }));
                }
            });
        }
        shadow.addEventListener('keydown', (e) => {
            const target = e.target;
            const row = target.closest('.student-row');
            const card = target.closest('.student-card');
            const element = row || card;
            if (!element)
                return;
            const currentIndex = parseInt(element.dataset.index);
            let newIndex = currentIndex;
            switch (e.key) {
                case 'ArrowUp':
                    newIndex = Math.max(0, currentIndex - 1);
                    break;
                case 'ArrowDown':
                    newIndex = Math.min(this.students.length - 1, currentIndex + 1);
                    break;
                case 'Home':
                    newIndex = 0;
                    break;
                case 'End':
                    newIndex = this.students.length - 1;
                    break;
                case 'Enter':
                case ' ':
                    if (card && !target.classList.contains('action-btn')) {
                        e.preventDefault();
                        this.dispatchEvent(new CustomEvent('student-card-selected', {
                            bubbles: true,
                            composed: true,
                            detail: { index: currentIndex }
                        }));
                        return;
                    }
                    break;
                default:
                    return;
            }
            if (newIndex !== currentIndex) {
                e.preventDefault();
                const newElement = shadow.querySelector(`[data-index="${newIndex}"]`);
                if (newElement) {
                    newElement.focus();
                    newElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        });
        shadow.addEventListener('focusin', (e) => {
            const target = e.target;
            const row = target.closest('.student-row');
            if (row) {
                shadow.querySelectorAll('.student-row.focused').forEach(el => el.classList.remove('focused'));
                row.classList.add('focused');
            }
        });
        shadow.addEventListener('focusout', (e) => {
            const target = e.target;
            const row = target.closest('.student-row');
            if (row && e.relatedTarget && !row.contains(e.relatedTarget)) {
                row.classList.remove('focused');
            }
        });
    }
    removeEventListeners() {
    }
    filterStudents() {
        if (!this.searchTerm) {
            this.students = [...this.originalStudents];
        }
        else {
            this.students = this.originalStudents.filter(student => student.name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.father_name?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.class?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.mobile?.includes(this.searchTerm) ||
                student.address?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.route?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.driver?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                student.fees?.includes(this.searchTerm));
        }
        this.updateTableBody();
        this.updateTotalCount();
    }
    sortTable(column) {
        if (this.sortColumn === column) {
            this.sortAscending = !this.sortAscending;
        }
        else {
            this.sortColumn = column;
            this.sortAscending = true;
        }
        this.students.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];
            if (aValue == null && bValue == null)
                return 0;
            if (aValue == null)
                return this.sortAscending ? 1 : -1;
            if (bValue == null)
                return this.sortAscending ? -1 : 1;
            aValue = aValue.toString().toLowerCase();
            bValue = bValue.toString().toLowerCase();
            if (aValue < bValue)
                return this.sortAscending ? -1 : 1;
            if (aValue > bValue)
                return this.sortAscending ? 1 : -1;
            return 0;
        });
        this.updateTableBody();
        this.updateSortIndicators();
    }
    updateTableBody() {
        if (this.isMobile) {
            const cardsContainer = this.shadowRoot.getElementById('student-cards');
            cardsContainer.innerHTML = this.renderStudentCards();
        }
        else {
            const tbody = this.shadowRoot.getElementById('table-body');
            tbody.innerHTML = this.renderTableRows();
        }
    }
    updateTotalCount() {
        const countElement = this.shadowRoot.getElementById('total-count');
        countElement.textContent = this.students.length.toString();
    }
    updateSortIndicators() {
        if (!this.isMobile) {
            const headers = this.shadowRoot.querySelectorAll('.sortable-header');
            headers.forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
                header.setAttribute('aria-sort', 'none');
            });
            if (this.sortColumn) {
                const currentHeader = this.shadowRoot.querySelector(`[data-column="${this.sortColumn}"]`);
                if (currentHeader) {
                    const sortDirection = this.sortAscending ? 'ascending' : 'descending';
                    currentHeader.classList.add(this.sortAscending ? 'sort-asc' : 'sort-desc');
                    currentHeader.setAttribute('aria-sort', sortDirection);
                }
            }
        }
    }
    initializeMediaQuery() {
        this.mediaQuery = window.matchMedia('(max-width: 768px)');
        this.mediaQuery.addEventListener('change', this.handleScreenSizeChange.bind(this));
    }
    checkScreenSize() {
        this.isMobile = this.mediaQuery.matches;
        this.markForRender();
    }
    handleScreenSizeChange(e) {
        this.isMobile = e.matches;
        this.markForRender();
    }
}
export { StudentTable };
//# sourceMappingURL=student-table.js.map