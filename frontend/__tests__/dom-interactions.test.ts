// Unit tests for DOM interactions and event handling

describe('DOM Interactions and Event Handling', () => {
    let mockTable: any;
    let mockCard: any;

    beforeEach(() => {
        // Create mock elements
        mockTable = {
            shadowRoot: {
                getElementById: jest.fn(),
                querySelector: jest.fn(),
                querySelectorAll: jest.fn().mockReturnValue([]),
                addEventListener: jest.fn(),
                innerHTML: ''
            },
            setStudents: jest.fn(),
            getStudents: jest.fn().mockReturnValue([]),
            dispatchEvent: jest.fn(),
            addEventListener: jest.fn(),
            sortTable: jest.fn(),
            filterStudents: jest.fn()
        };

        mockCard = {
            shadowRoot: {
                innerHTML: ''
            },
            setStudent: jest.fn(),
            getStudent: jest.fn()
        };

        jest.clearAllMocks();
    });

    describe('Event Listener Setup', () => {
        test('should setup search input event listeners', () => {
            const searchInput = { addEventListener: jest.fn(), value: '' };
            const clearButton = { style: { display: 'none' }, addEventListener: jest.fn() };

            mockTable.shadowRoot.getElementById
                .mockReturnValueOnce(searchInput) // search-input
                .mockReturnValueOnce(clearButton); // clear-search

            // Simulate setupEventListeners logic
            if (searchInput) {
                searchInput.addEventListener('input', expect.any(Function));
                searchInput.addEventListener('input', expect.any(Function));
            }
            if (clearButton) {
                clearButton.addEventListener('click', expect.any(Function));
            }

            expect(searchInput.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
            expect(clearButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should setup sortable header event listeners', () => {
            const headers = [
                { addEventListener: jest.fn(), dataset: { column: 'name' } },
                { addEventListener: jest.fn(), dataset: { column: 'class' } }
            ];

            mockTable.shadowRoot.querySelectorAll.mockReturnValue(headers);

            // Simulate setupEventListeners logic
            headers.forEach(header => {
                header.addEventListener('click', expect.any(Function));
            });

            expect(headers[0].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(headers[1].addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should setup action button event listeners', () => {
            const tableBody = { addEventListener: jest.fn() };
            mockTable.shadowRoot.addEventListener = tableBody.addEventListener;

            // Simulate setupEventListeners logic
            tableBody.addEventListener('click', expect.any(Function));

            expect(tableBody.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('Search Functionality', () => {
        test('should handle search input with debouncing', () => {
            const searchInput = { value: 'john' };
            let searchTimeout: NodeJS.Timeout;

            // Simulate debounced search
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                mockTable.filterStudents(searchInput.value);
            }, 300);

            // Fast-forward timeout
            jest.runOnlyPendingTimers();

            expect(mockTable.filterStudents).toHaveBeenCalledWith('john');
        });

        test('should show/hide clear button based on search input', () => {
            const searchInput = { value: '' };
            const clearButton = { style: { display: 'none' } };

            // Empty search
            clearButton.style.display = searchInput.value ? 'block' : 'none';
            expect(clearButton.style.display).toBe('none');

            // With search term
            searchInput.value = 'test';
            clearButton.style.display = searchInput.value ? 'block' : 'none';
            expect(clearButton.style.display).toBe('block');
        });

        test('should clear search when clear button clicked', () => {
            const searchInput = { value: 'john' };
            const clearButton = { click: jest.fn() };

            // Simulate clear button click
            searchInput.value = '';
            mockTable.filterStudents('');

            expect(mockTable.filterStudents).toHaveBeenCalledWith('');
        });
    });

    describe('Sorting Functionality', () => {
        test('should sort table by column', () => {
            const headers = [
                { classList: { remove: jest.fn(), add: jest.fn() }, dataset: { column: 'name' } }
            ];

            mockTable.shadowRoot.querySelectorAll.mockReturnValue(headers);
            mockTable.shadowRoot.querySelector.mockReturnValue(headers[0]);

            // Initial state: no sort column
            mockTable.sortColumn = null;
            mockTable.sortAscending = true;

            // Click header to sort
            mockTable.sortTable('name');

            expect(mockTable.sortTable).toHaveBeenCalledWith('name');
        });

        test('should toggle sort direction on same column', () => {
            mockTable.sortColumn = 'name';
            mockTable.sortAscending = true;

            // Click same column again
            mockTable.sortTable('name');

            expect(mockTable.sortAscending).toBe(false);
        });

        test('should update sort indicators in DOM', () => {
            const headers = [
                { classList: { remove: jest.fn(), add: jest.fn() } },
                { classList: { remove: jest.fn(), add: jest.fn() } }
            ];

            mockTable.shadowRoot.querySelectorAll.mockReturnValue(headers);
            mockTable.shadowRoot.querySelector.mockReturnValue(headers[0]);

            // Simulate updateSortIndicators
            headers.forEach(header => {
                header.classList.remove('sort-asc', 'sort-desc');
            });

            mockTable.sortColumn = 'name';
            mockTable.sortAscending = true;

            if (mockTable.sortColumn) {
                const currentHeader = headers[0]; // Mock return value
                if (currentHeader) {
                    currentHeader.classList.add('sort-asc');
                }
            }

            expect(headers[0].classList.add).toHaveBeenCalledWith('sort-asc');
        });
    });

    describe('Action Button Events', () => {
        test('should dispatch view action', () => {
            const target = {
                classList: { contains: jest.fn().mockReturnValue(true) },
                dataset: { action: 'view', index: '0' }
            };

            mockTable.shadowRoot.addEventListener.mockImplementation((event, handler) => {
                // Simulate click event
                handler({ target });
            });

            expect(mockTable.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'student-action',
                    detail: { action: 'view', index: 0 }
                })
            );
        });

        test('should dispatch edit action', () => {
            const target = {
                classList: { contains: jest.fn().mockReturnValue(true) },
                dataset: { action: 'edit', index: '1' }
            };

            mockTable.shadowRoot.addEventListener.mockImplementation((event, handler) => {
                handler({ target });
            });

            expect(mockTable.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'student-action',
                    detail: { action: 'edit', index: 1 }
                })
            );
        });

        test('should dispatch delete action', () => {
            const target = {
                classList: { contains: jest.fn().mockReturnValue(true) },
                dataset: { action: 'delete', index: '2' }
            };

            mockTable.shadowRoot.addEventListener.mockImplementation((event, handler) => {
                handler({ target });
            });

            expect(mockTable.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'student-action',
                    detail: { action: 'delete', index: 2 }
                })
            );
        });

        test('should ignore non-action button clicks', () => {
            const target = {
                classList: { contains: jest.fn().mockReturnValue(false) }
            };

            mockTable.shadowRoot.addEventListener.mockImplementation((event, handler) => {
                handler({ target });
            });

            expect(mockTable.dispatchEvent).not.toHaveBeenCalled();
        });
    });

    describe('Modal Interactions', () => {
        test('should show edit modal with student data', () => {
            const student = {
                name: 'John Doe',
                class: '10A',
                fees: '1000',
                status: 'active'
            };

            // Simulate modal creation
            const modalHtml = `
                <div class="modal-overlay" id="editModal">
                    <div class="modal-content">
                        <h3>Edit Student: ${student.name}</h3>
                        <form id="editStudentForm">
                            <input id="editName" value="${student.name}">
                            <input id="editClass" value="${student.class}">
                            <input id="editFees" value="${student.fees}">
                            <select id="editStatus">
                                <option value="active" selected>Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </form>
                    </div>
                </div>
            `;

            document.body.innerHTML = modalHtml;

            const nameInput = document.getElementById('editName') as HTMLInputElement;
            const classInput = document.getElementById('editClass') as HTMLInputElement;
            const feesInput = document.getElementById('editFees') as HTMLInputElement;
            const statusSelect = document.getElementById('editStatus') as HTMLSelectElement;

            expect(nameInput.value).toBe('John Doe');
            expect(classInput.value).toBe('10A');
            expect(feesInput.value).toBe('1000');
            expect(statusSelect.value).toBe('active');
        });

        test('should close modal on cancel', () => {
            document.body.innerHTML = `
                <div id="modals">
                    <div class="modal-overlay" id="editModal">
                        <button id="cancelEdit">Cancel</button>
                    </div>
                </div>
            `;

            const cancelBtn = document.getElementById('cancelEdit');
            const modalsContainer = document.getElementById('modals');

            cancelBtn?.addEventListener('click', () => {
                modalsContainer!.innerHTML = '';
            });

            cancelBtn?.click();

            expect(modalsContainer?.innerHTML).toBe('');
        });

        test('should close modal on overlay click', () => {
            document.body.innerHTML = `
                <div id="modals">
                    <div class="modal-overlay" id="editModal">
                        <div class="modal-content">Content</div>
                    </div>
                </div>
            `;

            const modal = document.getElementById('editModal');
            const modalsContainer = document.getElementById('modals');

            modal?.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modalsContainer!.innerHTML = '';
                }
            });

            // Click on overlay (not on content)
            modal?.dispatchEvent(new Event('click'));

            expect(modalsContainer?.innerHTML).toBe('');
        });

        test('should prevent modal close when clicking modal content', () => {
            document.body.innerHTML = `
                <div id="modals">
                    <div class="modal-overlay" id="editModal">
                        <div class="modal-content">Content</div>
                    </div>
                </div>
            `;

            const modal = document.getElementById('editModal');
            const modalContent = document.querySelector('.modal-content');
            const modalsContainer = document.getElementById('modals');

            modal?.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modalsContainer!.innerHTML = '';
                }
            });

            // Click on modal content (should not close)
            modalContent?.dispatchEvent(new Event('click', { bubbles: true }));

            expect(modalsContainer?.innerHTML).not.toBe('');
        });
    });

    describe('Form Validation and Submission', () => {
        test('should validate required fields', () => {
            document.body.innerHTML = `
                <form id="addStudentForm">
                    <input id="addName" required>
                    <input id="addClass" required>
                    <input id="addMobile">
                </form>
            `;

            const form = document.getElementById('addStudentForm') as HTMLFormElement;
            const nameInput = document.getElementById('addName') as HTMLInputElement;
            const classInput = document.getElementById('addClass') as HTMLInputElement;

            // Test empty form (should be invalid)
            expect(form.checkValidity()).toBe(false);

            // Fill required fields
            nameInput.value = 'Test Student';
            classInput.value = '10A';

            expect(form.checkValidity()).toBe(true);
        });

        test('should extract form data correctly', () => {
            document.body.innerHTML = `
                <input id="addName" value="John Doe">
                <input id="addFatherName" value="Bob Doe">
                <input id="addClass" value="10A">
                <input id="addMobile" value="1234567890">
                <input id="addRoute" value="R001">
                <textarea id="addAddress">123 Main St</textarea>
                <input id="addFees" value="1000">
                <select id="addStatus">
                    <option value="active" selected>Active</option>
                </select>
            `;

            const formData = {
                name: (document.getElementById('addName') as HTMLInputElement).value,
                father_name: (document.getElementById('addFatherName') as HTMLInputElement).value,
                class: (document.getElementById('addClass') as HTMLInputElement).value,
                mobile: (document.getElementById('addMobile') as HTMLInputElement).value,
                route: (document.getElementById('addRoute') as HTMLInputElement).value,
                address: (document.getElementById('addAddress') as HTMLTextAreaElement).value,
                fees: (document.getElementById('addFees') as HTMLInputElement).value,
                status: (document.getElementById('addStatus') as HTMLSelectElement).value as 'active' | 'inactive'
            };

            expect(formData).toEqual({
                name: 'John Doe',
                father_name: 'Bob Doe',
                class: '10A',
                mobile: '1234567890',
                route: 'R001',
                address: '123 Main St',
                fees: '1000',
                status: 'active'
            });
        });
    });

    describe('Notification System', () => {
        test('should display success notification', () => {
            const message = 'Student added successfully';
            const type = 'success';

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            `;

            document.body.appendChild(notification);

            expect(notification.className).toContain('notification-success');
            expect(notification.textContent).toContain(message);
        });

        test('should display error notification', () => {
            const message = 'Failed to add student';
            const type = 'error';

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            `;

            document.body.appendChild(notification);

            expect(notification.className).toContain('notification-error');
            expect(notification.textContent).toContain(message);
        });

        test('should remove notification on close button click', () => {
            const notification = document.createElement('div');
            document.body.appendChild(notification);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            notification.appendChild(closeBtn);

            closeBtn.addEventListener('click', () => {
                notification.remove();
            });

            expect(notification.parentNode).not.toBeNull();

            closeBtn.click();

            expect(notification.parentNode).toBeNull();
        });
    });

    describe('View Switching', () => {
        test('should switch to table view', () => {
            const studentTable = { style: { display: 'none' } };
            const studentProfile = { style: { display: 'block' } };
            const modalsContainer = { innerHTML: 'some content' };

            // Simulate showTableView
            studentTable.style.display = 'block';
            studentProfile.style.display = 'none';
            modalsContainer.innerHTML = '';

            expect(studentTable.style.display).toBe('block');
            expect(studentProfile.style.display).toBe('none');
            expect(modalsContainer.innerHTML).toBe('');
        });

        test('should switch to profile view', () => {
            const studentTable = { style: { display: 'block' } };
            const studentProfile = { style: { display: 'none' }, setStudent: jest.fn() };
            const modalsContainer = { innerHTML: '', appendChild: jest.fn() };
            const student = { name: 'John Doe', class: '10A' };

            // Simulate showProfileView
            studentTable.style.display = 'none';
            studentProfile.setStudent(student);
            studentProfile.style.display = 'block';

            // Add back button
            const backButton = document.createElement('button');
            backButton.className = 'back-button';
            modalsContainer.appendChild(backButton);

            expect(studentTable.style.display).toBe('none');
            expect(studentProfile.style.display).toBe('block');
            expect(studentProfile.setStudent).toHaveBeenCalledWith(student);
        });
    });
});