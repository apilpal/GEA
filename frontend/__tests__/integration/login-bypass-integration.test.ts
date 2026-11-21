/**
 * Integration tests for login bypass feature.
 *
 * Tests the complete flow from frontend UI to backend authentication:
 * - End-to-end bypass login flow
 * - Frontend-backend communication
 * - Session management for bypass users
 * - Configuration-driven behavior
 * - Security validation across layers
 * - Error propagation and handling
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Login Bypass Integration Tests', () => {
    let browser: Browser;
    let page: Page;
    let backendProcess: any;
    let frontendUrl = 'http://localhost:3000';
    let backendUrl = 'http://localhost:8000';

    beforeAll(async () => {
        // Start backend server
        backendProcess = spawn('python', ['main.py'], {
            cwd: path.join(__dirname, '../../../backend'),
            env: {
                ...process.env,
                LOGIN_BYPASS_ENABLED: 'true',
                LOGIN_BYPASS_USERNAME: 'test_bypass_user',
                LOGIN_BYPASS_ROLE: 'admin'
            }
        });

        // Wait for backend to start
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Start browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        if (backendProcess) {
            backendProcess.kill();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Mock environment variables for frontend
        await page.evaluateOnNewDocument(() => {
            window.localStorage.setItem('VITE_ENABLE_LOGIN_BYPASS', 'true');
            window.localStorage.setItem('VITE_LOGIN_BYPASS_USER', 'test_bypass_user');
        });
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    describe('Complete Bypass Login Flow', () => {
        test('should complete full bypass login flow from UI to authenticated state', async () => {
            // Arrange
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form', { timeout: 10000 });

            // Act - Click bypass login button
            const bypassButton = await page.$('#bypass-btn');
            expect(bypassButton).toBeTruthy();

            // Verify button is visible
            const isVisible = await bypassButton?.isVisible();
            expect(isVisible).toBe(true);

            // Click bypass button
            await bypassButton?.click();

            // Wait for authentication to complete
            await page.waitForFunction(
                () => {
                    const authState = (window as any).authContext?.getState();
                    return authState?.isAuthenticated === true;
                },
                { timeout: 10000 }
            );

            // Assert
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isAuthenticated).toBe(true);
            expect(authState.user?.is_bypass_user).toBe(true);
            expect(authState.user?.username).toBe('test_bypass_user');
            expect(authState.user?.role).toBe('admin');
        });

        test('should show bypass indicator in UI after successful bypass login', async () => {
            // Arrange
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act - Complete bypass login
            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            // Wait for authentication
            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Check profile component for bypass indicator
            await page.waitForSelector('.bypass-indicator', { timeout: 5000 });

            // Assert
            const bypassIndicator = await page.$('.bypass-indicator');
            expect(bypassIndicator).toBeTruthy();

            const indicatorText = await page.evaluate(el => el?.textContent, bypassIndicator);
            expect(indicatorText).toContain('⚠️ BYPASS USER');
        });

        test('should handle bypass login failure gracefully', async () => {
            // Arrange - Stop backend to simulate failure
            backendProcess.kill();
            await new Promise(resolve => setTimeout(resolve, 2000));

            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act - Try bypass login with backend down
            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            // Wait for error handling
            await page.waitForTimeout(3000);

            // Assert
            const errorMessage = await page.$('#error-message');
            const hasError = await errorMessage?.isVisible();
            expect(hasError).toBe(true);

            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isAuthenticated).toBe(false);
            expect(authState.error).toBeTruthy();
        });
    });

    describe('Configuration-Driven Behavior', () => {
        test('should hide bypass button when disabled in configuration', async () => {
            // Arrange - Set configuration to disabled
            await page.evaluateOnNewDocument(() => {
                window.localStorage.setItem('VITE_ENABLE_LOGIN_BYPASS', 'false');
            });

            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act & Assert
            const bypassSection = await page.$('#bypass-section');
            const isVisible = await bypassSection?.isVisible();
            expect(isVisible).toBe(false);
        });

        test('should use custom bypass user from configuration', async () => {
            // Arrange - Set custom bypass user
            await page.evaluateOnNewDocument(() => {
                window.localStorage.setItem('VITE_ENABLE_LOGIN_BYPASS', 'true');
                window.localStorage.setItem('VITE_LOGIN_BYPASS_USER', 'custom_dev_user');
            });

            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act - Complete bypass login
            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            // Wait for authentication
            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Assert
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.user?.username).toBe('custom_dev_user');
        });
    });

    describe('Session Management', () => {
        test('should maintain bypass session across page reloads', async () => {
            // Arrange - Complete bypass login
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Act - Reload page
            await page.reload();
            await page.waitForSelector('#login-form', { timeout: 5000 });

            // Wait for session restoration
            await page.waitForFunction(
                () => {
                    const authState = (window as any).authContext?.getState();
                    return authState?.isAuthenticated === true && authState?.user?.is_bypass_user;
                },
                { timeout: 10000 }
            );

            // Assert
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isAuthenticated).toBe(true);
            expect(authState.user?.is_bypass_user).toBe(true);
        });

        test('should properly logout bypass user', async () => {
            // Arrange - Complete bypass login
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Act - Logout
            const logoutButton = await page.$('#logout-btn');
            if (logoutButton) {
                await logoutButton.click();
            } else {
                // Trigger logout through auth context
                await page.evaluate(() => {
                    (window as any).authContext?.logout();
                });
            }

            // Wait for logout to complete
            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated === false,
                { timeout: 5000 }
            );

            // Assert
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isAuthenticated).toBe(false);
            expect(authState.user).toBeNull();
        });
    });

    describe('Security Validation', () => {
        test('should validate bypass user has admin permissions', async () => {
            // Arrange - Complete bypass login
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Act - Check admin permissions
            const hasAdminAccess = await page.evaluate(() => {
                return (window as any).authContext?.isAdmin();
            });

            // Assert
            expect(hasAdminAccess).toBe(true);

            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.user?.role).toBe('admin');
        });

        test('should properly handle token validation for bypass users', async () => {
            // Arrange - Complete bypass login
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Act - Test token validation
            const tokenValidation = await page.evaluate(async () => {
                try {
                    const response = await fetch('/auth/token/validate', {
                        credentials: 'include'
                    });
                    return {
                        status: response.status,
                        valid: response.ok
                    };
                } catch (error) {
                    return { valid: false, error: error.message };
                }
            });

            // Assert
            expect(tokenValidation.valid).toBe(true);
            expect(tokenValidation.status).toBe(200);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle network timeouts during bypass login', async () => {
            // Arrange - Mock slow network
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (request.url().includes('/auth/bypass-login')) {
                    setTimeout(() => request.continue(), 10000); // 10 second delay
                } else {
                    request.continue();
                }
            });

            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act - Try bypass login with timeout
            const bypassButton = await page.$('#bypass-btn');
            const loginPromise = bypassButton?.click();

            // Wait for timeout handling
            await page.waitForTimeout(12000);

            // Assert
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isLoading).toBe(false);
            expect(authState.error).toBeTruthy();
        });

        test('should handle malformed response from backend', async () => {
            // Arrange - Mock malformed response
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (request.url().includes('/auth/bypass-login')) {
                    request.respond({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            // Missing access_token
                            user: {
                                username: 'test',
                                role: 'admin'
                            }
                        })
                    });
                } else {
                    request.continue();
                }
            });

            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act - Try bypass login
            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForTimeout(2000);

            // Assert
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.error).toBeTruthy();
            expect(authState.error).toContain('No access token received');
        });

        test('should handle concurrent bypass login attempts', async () => {
            // Arrange
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act - Multiple rapid clicks
            const bypassButton = await page.$('#bypass-btn');
            const clicks = [];
            for (let i = 0; i < 5; i++) {
                clicks.push(bypassButton?.click());
            }

            await Promise.all(clicks);

            // Wait for completion
            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Assert - Should handle gracefully
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isAuthenticated).toBe(true);
            expect(authState.user?.is_bypass_user).toBe(true);
        });
    });

    describe('Performance and Reliability', () => {
        test('should complete bypass login within acceptable time', async () => {
            // Arrange
            const startTime = Date.now();

            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            // Act
            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Assert - Should complete within 5 seconds
            expect(duration).toBeLessThan(5000);
        });

        test('should handle rapid page navigation with bypass user', async () => {
            // Arrange - Complete bypass login
            await page.goto(frontendUrl);
            await page.waitForSelector('#login-form');

            const bypassButton = await page.$('#bypass-btn');
            await bypassButton?.click();

            await page.waitForFunction(
                () => (window as any).authContext?.getState()?.isAuthenticated,
                { timeout: 10000 }
            );

            // Act - Rapid navigation
            const pages = ['/dashboard', '/students', '/reports', '/dashboard'];
            for (const pagePath of pages) {
                await page.goto(`${frontendUrl}${pagePath}`);
                await page.waitForTimeout(500);
            }

            // Assert - Should maintain authentication
            const authState = await page.evaluate(() => {
                return (window as any).authContext?.getState();
            });

            expect(authState.isAuthenticated).toBe(true);
            expect(authState.user?.is_bypass_user).toBe(true);
        });
    });
});