// Unit tests for GuestDashboardComponent
// Using global test utilities and HTMLElement from jest.setup.js

describe('GuestDashboardComponent', () => {
    let guestDashboardComponent: any;

    beforeEach(() => {
        // Create component instance using global constructor
        guestDashboardComponent = new (global as any).GuestDashboardComponent();

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Component Initialization', () => {
        test('should initialize without errors', () => {
            expect(guestDashboardComponent).toBeTruthy();
            expect(guestDashboardComponent.guestDashboardContainer).toBeNull();
            expect(guestDashboardComponent.upgradePromptShown).toBe(false);
        });

        test('should skip initialization for non-guest users', async () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'regular_user',
                    is_guest: false
                })
            };

            const loadDashboardSpy = jest.spyOn(guestDashboardComponent, 'loadGuestDashboardData');

            // Act
            await guestDashboardComponent.initialize();

            // Assert
            expect(loadDashboardSpy).not.toHaveBeenCalled();
        });

        test('should initialize for guest users', async () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'guest_user',
                    is_guest: true
                })
            };

            const loadDashboardSpy = jest.spyOn(guestDashboardComponent, 'loadGuestDashboardData');
            const setupEventListenersSpy = jest.spyOn(guestDashboardComponent, 'setupEventListeners');

            // Act
            await guestDashboardComponent.initialize();

            // Assert
            expect(loadDashboardSpy).toHaveBeenCalled();
            expect(setupEventListenersSpy).toHaveBeenCalled();
        });
    });

    describe('Guest User Detection', () => {
        test('should correctly identify guest user', () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'guest_test',
                    is_guest: true
                })
            };

            // Act
            const result = guestDashboardComponent.isGuestUser();

            // Assert
            expect(result).toBe(true);
            expect(global.authService.getStoredUser).toHaveBeenCalled();
        });

        test('should correctly identify non-guest user', () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'regular_user',
                    is_guest: false
                })
            };

            // Act
            const result = guestDashboardComponent.isGuestUser();

            // Assert
            expect(result).toBe(false);
        });

        test('should return false when no user is stored', () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(null)
            };

            // Act
            const result = guestDashboardComponent.isGuestUser();

            // Assert
            expect(result).toBe(false);
        });

        test('should get current guest user data', () => {
            // Arrange
            const guestUser = {
                id: 1,
                username: 'guest_test',
                is_guest: true
            };
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(guestUser)
            };

            // Act
            const result = guestDashboardComponent.getCurrentGuestUser();

            // Assert
            expect(result).toEqual(guestUser);
        });

        test('should return null for non-guest user', () => {
            // Arrange
            const regularUser = {
                id: 1,
                username: 'regular_user',
                is_guest: false
            };
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(regularUser)
            };

            // Act
            const result = guestDashboardComponent.getCurrentGuestUser();

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('Dashboard Data Loading', () => {
        beforeEach(() => {
            // Setup guest user
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'guest_test',
                    is_guest: true
                })
            };
        });

        test('should load guest dashboard data successfully', async () => {
            // Arrange
            const mockResponse = {
                error: null,
                data: {
                    guest_access: true,
                    permissions: ['dashboard:read'],
                    summary: { total_students: 100, total_drivers: 10 },
                    message: 'Guest access - limited data available.'
                }
            };

            global.apiService = {
                get: jest.fn().mockResolvedValue(mockResponse)
            };

            const renderDashboardSpy = jest.spyOn(guestDashboardComponent, 'renderGuestDashboard');

            // Act
            await guestDashboardComponent.loadGuestDashboardData();

            // Assert
            expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
            expect(renderDashboardSpy).toHaveBeenCalledWith(mockResponse.data);
        });

        test('should handle dashboard data loading error', async () => {
            // Arrange
            const mockResponse = {
                error: 'API Error',
                data: null
            };

            global.apiService = {
                get: jest.fn().mockResolvedValue(mockResponse)
            };

            const showErrorSpy = jest.spyOn(guestDashboardComponent, 'showGuestDashboardError');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            await guestDashboardComponent.loadGuestDashboardData();

            // Assert
            expect(global.apiService.get).toHaveBeenCalledWith('/auth/guest/dashboard');
            expect(showErrorSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GUEST-DASHBOARD] Failed to load guest dashboard data:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        test('should handle network error during data loading', async () => {
            // Arrange
            const networkError = new Error('Network error');
            global.apiService = {
                get: jest.fn().mockRejectedValue(networkError)
            };

            const showErrorSpy = jest.spyOn(guestDashboardComponent, 'showGuestDashboardError');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            await guestDashboardComponent.loadGuestDashboardData();

            // Assert
            expect(showErrorSpy).toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GUEST-DASHBOARD] Failed to load guest dashboard data:',
                networkError
            );

            consoleSpy.mockRestore();
        });
    });

    describe('Dashboard Rendering', () => {
        test('should render guest dashboard correctly', () => {
            // Arrange
            const dashboardData = {
                guest_access: true,
                permissions: ['dashboard:read'],
                summary: { total_students: 100, total_drivers: 10 },
                message: 'Guest access - limited data available.'
            };

            // Setup DOM container
            document.body.innerHTML = '<div data-guest-dashboard></div>';
            guestDashboardComponent.guestDashboardContainer = document.querySelector('[data-guest-dashboard]');

            // Act
            guestDashboardComponent.renderGuestDashboard(dashboardData);

            // Assert
            const container = guestDashboardComponent.guestDashboardContainer;
            expect(container).toBeTruthy();
            expect(container.classList.contains('guest-dashboard')).toBe(true);

            const header = container.querySelector('.guest-dashboard-header');
            expect(header).toBeTruthy();
            expect(header.textContent).toContain('Welcome, Guest User!');
            expect(header.textContent).toContain('Upgrade to Full Account');
        });

        test('should update summary data with guest indicators', () => {
            // Arrange
            const summaryData = { total_students: 100, total_drivers: 10 };

            // Setup DOM elements
            document.body.innerHTML = `
                <div id="total-students-dash">0</div>
                <div id="total-drivers-dash">0</div>
            `;

            // Act
            guestDashboardComponent.updateGuestSummaryData(summaryData);

            // Assert
            const studentsElement = document.getElementById('total-students-dash');
            const driversElement = document.getElementById('total-drivers-dash');

            expect(studentsElement.textContent).toBe('100');
            expect(driversElement.textContent).toBe('10');

            // Check for guest indicators
            const studentIndicator = studentsElement.querySelector('.guest-indicator');
            const driverIndicator = driversElement.querySelector('.guest-indicator');

            expect(studentIndicator).toBeTruthy();
            expect(driverIndicator).toBeTruthy();
            expect((studentIndicator as HTMLElement).title).toBe('Limited view');
        });

        test('should handle missing dashboard container gracefully', () => {
            // Arrange
            document.body.innerHTML = '<div>No dashboard container</div>';
            const dashboardData = {
                guest_access: true,
                permissions: ['dashboard:read'],
                summary: {},
                message: 'Test message'
            };

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Act
            guestDashboardComponent.renderGuestDashboard(dashboardData);

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith('[GUEST-DASHBOARD] No dashboard container found');
            consoleSpy.mockRestore();
        });
    });

    describe('Upgrade Prompt Management', () => {
        test('should show upgrade prompt after delay', () => {
            // Arrange
            jest.useFakeTimers();

            // Act
            guestDashboardComponent.showUpgradePrompt();

            // Fast-forward time by 10 seconds
            jest.advanceTimersByTime(10000);

            // Assert
            const modal = document.querySelector('.guest-upgrade-modal');
            expect(modal).toBeTruthy();
            expect(modal.textContent).toContain('Upgrade Your Account');
            expect(guestDashboardComponent.upgradePromptShown).toBe(true);

            jest.useRealTimers();
        });

        test('should not show upgrade prompt if already shown', () => {
            // Arrange
            guestDashboardComponent.upgradePromptShown = true;

            // Act
            guestDashboardComponent.showUpgradePrompt();

            // Assert
            const modal = document.querySelector('.guest-upgrade-modal');
            expect(modal).toBeFalsy();
        });

        test('should dismiss upgrade prompt correctly', () => {
            // Arrange
            document.body.innerHTML = '<div class="guest-upgrade-modal">Modal content</div>';
            guestDashboardComponent.upgradePromptShown = true;

            // Act
            guestDashboardComponent.dismissUpgradePrompt();

            // Assert
            const modal = document.querySelector('.guest-upgrade-modal');
            expect(modal).toBeFalsy();
            expect(guestDashboardComponent.upgradePromptShown).toBe(false);
        });

        test('should handle upgrade now action', () => {
            // Arrange
            const dispatchEventSpy = jest.spyOn(document, 'dispatchEvent');

            // Act
            guestDashboardComponent.handleUpgradeNow();

            // Assert
            expect(dispatchEventSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'guest-upgrade-requested'
                })
            );
            expect(window.location.href).toBe('/register?guest=true');

            dispatchEventSpy.mockRestore();
        });
    });

    describe('Error Handling', () => {
        test('should show dashboard error correctly', () => {
            // Arrange
            document.body.innerHTML = '<div data-guest-dashboard></div>';
            guestDashboardComponent.guestDashboardContainer = document.querySelector('[data-guest-dashboard]');

            // Act
            guestDashboardComponent.showGuestDashboardError();

            // Assert
            const container = guestDashboardComponent.guestDashboardContainer;
            const errorDiv = container.querySelector('.guest-dashboard-error');
            expect(errorDiv).toBeTruthy();
            expect(errorDiv.textContent).toContain('Unable to load guest dashboard data');
            expect(errorDiv.textContent).toContain('Retry');
        });

        test('should handle missing dashboard container for error display', () => {
            // Arrange
            document.body.innerHTML = '<div>No dashboard container</div>';
            guestDashboardComponent.guestDashboardContainer = null;

            // Act (should not throw)
            expect(() => {
                guestDashboardComponent.showGuestDashboardError();
            }).not.toThrow();
        });
    });

    describe('Event Handling', () => {
        test('should set up event listeners correctly', () => {
            // Arrange
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

            // Act
            guestDashboardComponent.setupEventListeners();

            // Assert
            expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should handle upgrade button click', () => {
            // Arrange
            const upgradeButton = document.createElement('button');
            upgradeButton.setAttribute('data-guest-upgrade', '');

            const mockEvent = {
                target: upgradeButton,
                preventDefault: jest.fn()
            };

            const handleUpgradeNowSpy = jest.spyOn(guestDashboardComponent, 'handleUpgradeNow');

            // Act
            guestDashboardComponent.setupEventListeners();
            const clickHandler = (document.addEventListener as jest.MockedFunction<any>).mock.calls[0][1];
            clickHandler(mockEvent);

            // Assert
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(handleUpgradeNowSpy).toHaveBeenCalled();
        });

        test('should handle retry button click', () => {
            // Arrange
            const retryButton = document.createElement('button');
            retryButton.setAttribute('data-retry-guest-dashboard', '');

            const mockEvent = {
                target: retryButton,
                preventDefault: jest.fn()
            };

            const loadDashboardSpy = jest.spyOn(guestDashboardComponent, 'loadGuestDashboardData');

            // Act
            guestDashboardComponent.setupEventListeners();
            const clickHandler = (document.addEventListener as jest.MockedFunction<any>).mock.calls[0][1];
            clickHandler(mockEvent);

            // Assert
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(loadDashboardSpy).toHaveBeenCalled();
        });

        test('should handle guest upgrade requested event', () => {
            // Arrange
            const handleUpgradeNowSpy = jest.spyOn(guestDashboardComponent, 'handleUpgradeNow');

            // Act
            guestDashboardComponent.setupEventListeners();
            document.dispatchEvent(new CustomEvent('guest-upgrade-requested'));

            // Assert
            expect(handleUpgradeNowSpy).toHaveBeenCalled();
        });
    });

    describe('Component Lifecycle', () => {
        test('should destroy component correctly', () => {
            // Arrange
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

            // Act
            guestDashboardComponent.destroy();

            // Assert
            expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(removeEventListenerSpy).toHaveBeenCalledWith('guest-upgrade-requested', expect.any(Function));
            expect(guestDashboardComponent.guestDashboardContainer).toBeNull();
            expect(guestDashboardComponent.upgradePromptShown).toBe(false);
        });

        test('should refresh dashboard data for guest users', async () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'guest_test',
                    is_guest: true
                })
            };

            const loadDashboardSpy = jest.spyOn(guestDashboardComponent, 'loadGuestDashboardData');

            // Act
            await guestDashboardComponent.refresh();

            // Assert
            expect(loadDashboardSpy).toHaveBeenCalled();
        });

        test('should not refresh dashboard data for non-guest users', async () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue({
                    id: 1,
                    username: 'regular_user',
                    is_guest: false
                })
            };

            const loadDashboardSpy = jest.spyOn(guestDashboardComponent, 'loadGuestDashboardData');

            // Act
            await guestDashboardComponent.refresh();

            // Assert
            expect(loadDashboardSpy).not.toHaveBeenCalled();
        });
    });

    describe('DOM Helper Functions', () => {
        test('should add guest indicator to elements', () => {
            // Arrange
            const element = document.createElement('div');
            const tooltip = 'Limited view';

            // Act
            guestDashboardComponent.addGuestIndicator(element, tooltip);

            // Assert
            const indicator = element.querySelector('.guest-indicator');
            expect(indicator).toBeTruthy();
            expect((indicator as HTMLElement).title).toBe(tooltip);
            expect(indicator.textContent).toBe('👁️');
            expect(element.style.position).toBe('relative');
        });

        test('should handle indicator addition to existing styled elements', () => {
            // Arrange
            const element = document.createElement('div');
            element.style.position = 'absolute';
            const tooltip = 'Test tooltip';

            // Act
            guestDashboardComponent.addGuestIndicator(element, tooltip);

            // Assert
            expect(element.style.position).toBe('absolute'); // Should preserve existing style
            const indicator = element.querySelector('.guest-indicator');
            expect(indicator).toBeTruthy();
        });
    });

    describe('Data Integration', () => {
        test('should handle empty summary data gracefully', () => {
            // Arrange
            const emptySummaryData = {};

            // Act (should not throw)
            expect(() => {
                guestDashboardComponent.updateGuestSummaryData(emptySummaryData);
            }).not.toThrow();
        });

        test('should handle null summary data gracefully', () => {
            // Arrange
            const nullSummaryData = null;

            // Act (should not throw)
            expect(() => {
                guestDashboardComponent.updateGuestSummaryData(nullSummaryData);
            }).not.toThrow();
        });

        test('should handle partial summary data', () => {
            // Arrange
            const partialSummaryData = { total_students: 50 };

            // Setup DOM elements
            document.body.innerHTML = '<div id="total-students-dash">0</div>';

            // Act
            guestDashboardComponent.updateGuestSummaryData(partialSummaryData);

            // Assert
            const studentsElement = document.getElementById('total-students-dash');
            expect(studentsElement.textContent).toBe('50');

            // Drivers element should remain unchanged if not in data
            const driversElement = document.getElementById('total-drivers-dash');
            expect(driversElement).toBeFalsy(); // Element doesn't exist
        });
    });

    describe('Modal Interactions', () => {
        test('should handle modal click events correctly', () => {
            // Arrange
            document.body.innerHTML = `
                <div class="guest-upgrade-modal">
                    <div class="upgrade-modal-content">
                        <button data-dismiss-upgrade>Dismiss</button>
                        <button data-upgrade-now>Upgrade</button>
                    </div>
                </div>
            `;

            const dismissSpy = jest.spyOn(guestDashboardComponent, 'dismissUpgradePrompt');
            const upgradeSpy = jest.spyOn(guestDashboardComponent, 'handleUpgradeNow');

            // Act - Test dismiss button
            const dismissButton = document.querySelector('[data-dismiss-upgrade]');
            const dismissEvent = new Event('click');
            dismissButton.dispatchEvent(dismissEvent);

            // Assert
            expect(dismissSpy).toHaveBeenCalled();

            // Act - Test upgrade button
            const upgradeButton = document.querySelector('[data-upgrade-now]');
            const upgradeEvent = new Event('click');
            upgradeButton.dispatchEvent(upgradeEvent);

            // Assert
            expect(upgradeSpy).toHaveBeenCalled();
        });
    });
});