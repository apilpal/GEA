// Unit tests for GuestLoginComponent
// Using global test utilities and HTMLElement from jest.setup.js

describe('GuestLoginComponent', () => {
    let guestLoginComponent: any;

    beforeEach(() => {
        // Create component instance using global constructor
        guestLoginComponent = new (global as any).GuestLoginComponent();

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('Component Initialization', () => {
        test('should initialize with correct constants', () => {
            expect(guestLoginComponent.GUEST_ACCESS_KEY).toBe('guest_access_enabled');
        });

        test('should initialize without errors', () => {
            expect(guestLoginComponent).toBeTruthy();
            expect(guestLoginComponent.guestLoginButton).toBeNull();
            expect(guestLoginComponent.guestStatusIndicator).toBeNull();
        });
    });

    describe('Guest Access Management', () => {
        test('should enable guest access in localStorage', () => {
            guestLoginComponent.enableGuestAccess();

            expect(localStorage.setItem).toHaveBeenCalledWith('guest_access_enabled', 'true');
        });

        test('should disable guest access in localStorage', () => {
            guestLoginComponent.disableGuestAccess();

            expect(localStorage.removeItem).toHaveBeenCalledWith('guest_access_enabled');
        });

        test('should check guest access status correctly', () => {
            // Test when guest access is enabled
            localStorage.getItem = jest.fn().mockReturnValue('true');
            expect(guestLoginComponent.isGuestAccessEnabled()).toBe(true);

            // Test when guest access is disabled
            localStorage.getItem = jest.fn().mockReturnValue(null);
            expect(guestLoginComponent.isGuestAccessEnabled()).toBe(false);

            // Test when localStorage throws error
            localStorage.getItem = jest.fn().mockImplementation(() => {
                throw new Error('localStorage error');
            });
            expect(guestLoginComponent.isGuestAccessEnabled()).toBe(false);
        });
    });

    describe('Guest User Detection', () => {
        test('should correctly identify guest user', () => {
            // Arrange
            const guestUser = { id: 1, username: 'guest_test', is_guest: true };
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(guestUser)
            };

            // Act
            const result = guestLoginComponent.isGuestUser();

            // Assert
            expect(result).toBe(true);
            expect(global.authService.getStoredUser).toHaveBeenCalled();
        });

        test('should correctly identify non-guest user', () => {
            // Arrange
            const regularUser = { id: 1, username: 'regular_user', is_guest: false };
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(regularUser)
            };

            // Act
            const result = guestLoginComponent.isGuestUser();

            // Assert
            expect(result).toBe(false);
        });

        test('should return false when no user is stored', () => {
            // Arrange
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(null)
            };

            // Act
            const result = guestLoginComponent.isGuestUser();

            // Assert
            expect(result).toBe(false);
        });

        test('should get current guest user data', () => {
            // Arrange
            const guestUser = { id: 1, username: 'guest_test', is_guest: true };
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(guestUser)
            };

            // Act
            const result = guestLoginComponent.getCurrentGuestUser();

            // Assert
            expect(result).toEqual(guestUser);
        });

        test('should return null for non-guest user', () => {
            // Arrange
            const regularUser = { id: 1, username: 'regular_user', is_guest: false };
            global.authService = {
                getStoredUser: jest.fn().mockReturnValue(regularUser)
            };

            // Act
            const result = guestLoginComponent.getCurrentGuestUser();

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('UI State Management', () => {
        test('should show loading state correctly', () => {
            // Arrange
            const mockButton = document.createElement('button');
            mockButton.innerHTML = '<span>Continue as Guest</span>';
            guestLoginComponent.guestLoginButton = mockButton;

            // Act
            guestLoginComponent.showLoadingState();

            // Assert
            expect(mockButton.disabled).toBe(true);
            expect(mockButton.innerHTML).toContain('Creating Guest Session...');
        });

        test('should hide loading state correctly', () => {
            // Arrange
            const mockButton = document.createElement('button');
            mockButton.disabled = true;
            mockButton.innerHTML = '<span>Creating...</span>';
            guestLoginComponent.guestLoginButton = mockButton;

            // Act
            guestLoginComponent.hideLoadingState();

            // Assert
            expect(mockButton.disabled).toBe(false);
            expect(mockButton.innerHTML).toContain('Continue as Guest');
        });

        test('should show error state correctly', () => {
            // Arrange
            const errorMessage = 'Test error message';

            // Act
            guestLoginComponent.showErrorState(errorMessage);

            // Assert
            const errorElement = document.querySelector('[data-guest-error]');
            expect(errorElement).toBeTruthy();
            expect(errorElement?.textContent).toBe(errorMessage);
        });
    });

    describe('DOM Manipulation', () => {
        test('should show guest login option when access not enabled', () => {
            // Arrange
            localStorage.getItem = jest.fn().mockReturnValue(null);

            // Act
            guestLoginComponent.showGuestLoginOption();

            // Assert
            const guestButton = document.querySelector('[data-guest-login]');
            const guestToggle = document.querySelector('.guest-toggle');

            expect(guestButton).toBeTruthy();
            expect(guestToggle).toBeTruthy();
            expect(guestButton?.textContent).toContain('Continue as Guest');
        });

        test('should show guest status when access is enabled', () => {
            // Arrange
            localStorage.getItem = jest.fn().mockReturnValue('true');

            // Act
            guestLoginComponent.showGuestStatus();

            // Assert
            const statusIndicator = document.querySelector('[data-guest-status]');
            const guestLoginButton = document.querySelector('[data-guest-login]');

            expect(statusIndicator).toBeTruthy();
            expect(guestLoginButton).toBeNull(); // Should be removed
            expect(statusIndicator?.textContent).toContain('Guest User');
        });

        test('should handle missing auth container gracefully', () => {
            // Arrange
            document.body.innerHTML = '<div>No auth container</div>';
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            // Act
            guestLoginComponent.showGuestLoginOption();

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith('[GUEST-LOGIN] No auth container found');
            consoleSpy.mockRestore();
        });
    });

    describe('Event Handling', () => {
        test('should set up event listeners correctly', () => {
            // Arrange
            const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

            // Act
            guestLoginComponent.setupEventListeners();

            // Assert
            expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should handle guest login button click', () => {
            // Arrange
            const mockEvent = {
                target: document.querySelector('[data-guest-login]'),
                preventDefault: jest.fn()
            };

            const handleGuestLoginSpy = jest.spyOn(guestLoginComponent, 'handleGuestLogin');

            // Act
            guestLoginComponent.setupEventListeners();
            const clickHandler = document.addEventListener.mock.calls[0][1];
            clickHandler(mockEvent);

            // Assert
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(handleGuestLoginSpy).toHaveBeenCalled();
        });
    });

    describe('Navigation Handling', () => {
        test('should handle post-login navigation to dashboard', () => {
            // Arrange
            Object.defineProperty(window.location, 'href', {
                value: '',
                writable: true
            });

            // Act
            guestLoginComponent.handlePostLoginNavigation();

            // Assert
            expect(window.location.href).toBe('/dashboard');
        });

        test('should reload page when already on dashboard', () => {
            // Arrange
            Object.defineProperty(window.location, 'pathname', {
                value: '/dashboard',
                writable: true
            });
            Object.defineProperty(window.location, 'reload', {
                value: jest.fn(),
                writable: true
            });

            // Act
            guestLoginComponent.handlePostLoginNavigation();

            // Assert
            expect(window.location.reload).toHaveBeenCalled();
        });
    });

    describe('Component Lifecycle', () => {
        test('should destroy component correctly', () => {
            // Arrange
            const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

            // Act
            guestLoginComponent.destroy();

            // Assert
            expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
            expect(guestLoginComponent.guestLoginButton).toBeNull();
            expect(guestLoginComponent.guestStatusIndicator).toBeNull();
        });

        test('should initialize with guest access already enabled', async () => {
            // Arrange
            localStorage.getItem = jest.fn().mockReturnValue('true');
            const showGuestStatusSpy = jest.spyOn(guestLoginComponent, 'showGuestStatus');

            // Act
            await guestLoginComponent.initialize();

            // Assert
            expect(showGuestStatusSpy).toHaveBeenCalled();
        });

        test('should initialize with guest access not enabled', async () => {
            // Arrange
            localStorage.getItem = jest.fn().mockReturnValue(null);
            const showGuestLoginOptionSpy = jest.spyOn(guestLoginComponent, 'showGuestLoginOption');
            const setupEventListenersSpy = jest.spyOn(guestLoginComponent, 'setupEventListeners');

            // Act
            await guestLoginComponent.initialize();

            // Assert
            expect(showGuestLoginOptionSpy).toHaveBeenCalled();
            expect(setupEventListenersSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle localStorage errors gracefully', () => {
            // Arrange
            localStorage.setItem = jest.fn().mockImplementation(() => {
                throw new Error('localStorage quota exceeded');
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            guestLoginComponent.enableGuestAccess();

            // Assert
            expect(consoleSpy).toHaveBeenCalledWith(
                '[GUEST-LOGIN] Failed to enable guest access:',
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });
    });
});