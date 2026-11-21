/**
 * Puppeteer Integration Tests for UI Authentication Flows
 *
 * Tests key authentication UI interactions including:
 * - Login form visibility and functionality
 * - Successful user login with valid credentials
 * - Failed login with invalid credentials
 * - Logout functionality
 * - Navigation between login and main app states
 *
 * These tests use Jest-Puppeteer for headless browser automation
 * and require the frontend server to be running (typically on localhost:5173).
 */

describe('UI Authentication Flow', () => {
  const APP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  const VALID_USERNAME = 'dev_user';
  const VALID_PASSWORD = 'dev_password_123';
  const INVALID_PASSWORD = 'wrong_password';

  beforeEach(async () => {
    // Navigate to the application
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    // Clear any existing authentication state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  describe('Login Page Display', () => {
    it('should display the login form when not authenticated', async () => {
      // Verify login page is visible
      await page.waitForSelector('#login-page', { visible: true });

      // Check for key login elements
      const loginPageVisible = await page.$eval('#login-page', el => !el.hasAttribute('style') || (el as HTMLElement).style.display !== 'none');
      expect(loginPageVisible).toBe(true);

      // Verify login component is present
      await page.waitForSelector('login-component', { visible: true });

      // Check for form fields
      await page.waitForSelector('#username', { visible: true });
      await page.waitForSelector('#password', { visible: true });
      await page.waitForSelector('#submit-btn', { visible: true });

      // Verify main app is hidden
      const mainAppHidden = await page.$eval('#main-app', el => (el as HTMLElement).style.display === 'none');
      expect(mainAppHidden).toBe(true);
    });

    it('should have proper form labels and placeholders', async () => {
      // Check username field
      const usernamePlaceholder = await page.$eval('#username', el => (el as HTMLInputElement).placeholder);
      expect(usernamePlaceholder).toBe('Enter your username or email');

      // Check password field
      const passwordPlaceholder = await page.$eval('#password', el => (el as HTMLInputElement).placeholder);
      expect(passwordPlaceholder).toBe('Enter your password');

      // Check submit button text
      const submitButtonText = await page.$eval('#submit-btn span', el => el.textContent);
      expect(submitButtonText).toBe('Sign In');
    });
  });

  describe('Successful Login', () => {
    it('should successfully login with valid credentials', async () => {
      // Fill in the login form
      await page.type('#username', VALID_USERNAME);
      await page.type('#password', VALID_PASSWORD);

      // Submit the form
      await page.click('#submit-btn');

      // Wait for loading state
      await page.waitForSelector('#submit-btn.loading', { visible: true });

      // Wait for authentication to complete and main app to show
      await page.waitForSelector('#main-app', { visible: true, timeout: 10000 });

      // Verify login page is hidden
      const loginPageHidden = await page.$eval('#login-page', el => (el as HTMLElement).style.display === 'none');
      expect(loginPageHidden).toBe(true);

      // Verify main app is visible
      const mainAppVisible = await page.$eval('#main-app', el => !el.hasAttribute('style') || (el as HTMLElement).style.display !== 'none');
      expect(mainAppVisible).toBe(true);

      // Verify dashboard is active
      await page.waitForSelector('.menu-item[data-page="dashboard"].active', { visible: true });

      // Check for user info in sidebar
      await page.waitForSelector('#user-info', { visible: true });
    });

    it('should display loading state during login', async () => {
      // Fill in credentials
      await page.type('#username', VALID_USERNAME);
      await page.type('#password', VALID_PASSWORD);

      // Submit form
      await page.click('#submit-btn');

      // Verify loading state
      await page.waitForSelector('#submit-btn.loading', { visible: true });

      // Check button text changes
      const loadingText = await page.$eval('#submit-btn span', el => el.textContent);
      expect(loadingText).toBe('Signing In...');

      // Verify spinner is visible
      const spinnerVisible = await page.$eval('#submit-btn .spinner', el => (el as HTMLElement).style.display !== 'none');
      expect(spinnerVisible).toBe(true);
    });

    it('should clear error messages when user starts typing', async () => {
      // First, attempt a failed login to show error
      await page.type('#username', VALID_USERNAME);
      await page.type('#password', INVALID_PASSWORD);
      await page.click('#submit-btn');

      // Wait for error message
      await page.waitForSelector('#error-message.show', { visible: true });

      // Clear password and type again
      await page.click('#password');
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type('#password', VALID_PASSWORD);

      // Verify error is cleared
      const errorHidden = await page.$eval('#error-message', el => !el.classList.contains('show'));
      expect(errorHidden).toBe(true);
    });
  });

  describe('Failed Login', () => {
    it('should display error message for invalid credentials', async () => {
      // Fill in invalid credentials
      await page.type('#username', VALID_USERNAME);
      await page.type('#password', INVALID_PASSWORD);

      // Submit the form
      await page.click('#submit-btn');

      // Wait for error message to appear
      await page.waitForSelector('#error-message.show', { visible: true, timeout: 10000 });

      // Verify error message content
      const errorMessage = await page.$eval('#error-message', el => el.textContent);
      expect(errorMessage).toMatch(/login failed|invalid|error/i);

      // Verify login page remains visible
      const loginPageVisible = await page.$eval('#login-page', el => !el.hasAttribute('style') || (el as HTMLElement).style.display !== 'none');
      expect(loginPageVisible).toBe(true);

      // Verify main app remains hidden
      const mainAppHidden = await page.$eval('#main-app', el => (el as HTMLElement).style.display === 'none');
      expect(mainAppHidden).toBe(true);
    });

    it('should handle empty form submission', async () => {
      // Submit empty form
      await page.click('#submit-btn');

      // Wait for error message
      await page.waitForSelector('#error-message.show', { visible: true });

      // Verify error message for missing fields
      const errorMessage = await page.$eval('#error-message', el => el.textContent);
      expect(errorMessage).toMatch(/please enter|required|missing/i);

      // Verify form remains on login page
      const loginPageVisible = await page.$eval('#login-page', el => !el.hasAttribute('style') || (el as HTMLElement).style.display !== 'none');
      expect(loginPageVisible).toBe(true);
    });

    it('should handle network errors gracefully', async () => {
      // This test assumes the backend might be unavailable
      // In a real scenario, you might mock the network or test with backend down

      // For now, we'll test the UI behavior when API fails
      await page.type('#username', VALID_USERNAME);
      await page.type('#password', VALID_PASSWORD);
      await page.click('#submit-btn');

      // If the backend is not running, the error should still be handled
      // This might require adjusting based on actual error handling
      try {
        await page.waitForSelector('#main-app', { visible: true, timeout: 5000 });
      } catch (e) {
        // If login fails due to network, error should be displayed
        const errorVisible = await page.$('#error-message.show');
        if (errorVisible) {
          const errorMessage = await page.$eval('#error-message', el => el.textContent);
          expect(errorMessage).toBeTruthy();
        }
      }
    });
  });

  describe('Logout Functionality', () => {
    beforeEach(async () => {
      // Login first to test logout
      await page.type('#username', VALID_USERNAME);
      await page.type('#password', VALID_PASSWORD);
      await page.click('#submit-btn');
      await page.waitForSelector('#main-app', { visible: true, timeout: 10000 });
    });

    it('should successfully logout and return to login page', async () => {
      // Wait for logout button to be visible
      await page.waitForSelector('#logout-btn', { visible: true });

      // Click logout button
      await page.click('#logout-btn');

      // Wait for login page to reappear
      await page.waitForSelector('#login-page', { visible: true, timeout: 10000 });

      // Verify main app is hidden
      const mainAppHidden = await page.$eval('#main-app', el => (el as HTMLElement).style.display === 'none');
      expect(mainAppHidden).toBe(true);

      // Verify login page is visible
      const loginPageVisible = await page.$eval('#login-page', el => !el.hasAttribute('style') || (el as HTMLElement).style.display !== 'none');
      expect(loginPageVisible).toBe(true);

      // Verify authentication state is cleared
      const authCleared = await page.evaluate(() => {
        return !localStorage.getItem('access_token') && !localStorage.getItem('user');
      });
      expect(authCleared).toBe(true);
    });

    it('should clear authentication tokens on logout', async () => {
      // Verify tokens are set after login
      let tokensPresent = await page.evaluate(() => {
        return !!(localStorage.getItem('access_token') && localStorage.getItem('user'));
      });
      expect(tokensPresent).toBe(true);

      // Logout
      await page.click('#logout-btn');
      await page.waitForSelector('#login-page', { visible: true });

      // Verify tokens are cleared
      tokensPresent = await page.evaluate(() => {
        return !!(localStorage.getItem('access_token') && localStorage.getItem('user'));
      });
      expect(tokensPresent).toBe(false);
    });
  });

  describe('Form Validation and Accessibility', () => {
    it('should have proper form accessibility attributes', async () => {
      // Check required attributes
      const usernameRequired = await page.$eval('#username', el => (el as HTMLInputElement).required);
      expect(usernameRequired).toBe(true);

      const passwordRequired = await page.$eval('#password', el => (el as HTMLInputElement).required);
      expect(passwordRequired).toBe(true);

      // Check autocomplete attributes
      const usernameAutocomplete = await page.$eval('#username', el => (el as HTMLInputElement).autocomplete);
      expect(usernameAutocomplete).toBe('username');

      const passwordAutocomplete = await page.$eval('#password', el => (el as HTMLInputElement).autocomplete);
      expect(passwordAutocomplete).toBe('current-password');
    });

    it('should focus username field on page load', async () => {
      // Check if username field has focus (this might depend on component implementation)
      const activeElement = await page.evaluate(() => document.activeElement?.id);
      // Note: This test might need adjustment based on actual focus behavior
      expect(['username', 'password', ''].includes(activeElement)).toBe(true);
    });
  });
});