// Login Component Diagnosis Script
// Run this in browser console to diagnose login visibility issues

(function() {
    console.log('🔍 LOGIN COMPONENT DIAGNOSIS');
    console.log('================================');

    // 1. Check DOM Elements
    console.log('\n📋 DOM ELEMENTS CHECK:');
    const loginContainer = document.getElementById('login-container');
    const mainApp = document.getElementById('main-app');
    const authLoading = document.getElementById('auth-loading');

    console.log('Login container:', loginContainer ? '✅ Found' : '❌ Missing');
    if (loginContainer) {
        const styles = window.getComputedStyle(loginContainer);
        console.log('  Display:', styles.display);
        console.log('  Visibility:', styles.visibility);
        console.log('  Width:', styles.width, 'Height:', styles.height);
        console.log('  Has login component:', !!loginContainer.querySelector('login-component'));
    }

    console.log('Main app:', mainApp ? '✅ Found' : '❌ Missing');
    if (mainApp) {
        const styles = window.getComputedStyle(mainApp);
        console.log('  Display:', styles.display);
        console.log('  Visibility:', styles.visibility);
    }

    console.log('Auth loading:', authLoading ? '✅ Found' : '❌ Missing');
    if (authLoading) {
        const styles = window.getComputedStyle(authLoading);
        console.log('  Display:', styles.display);
        console.log('  Visibility:', styles.visibility);
    }

    // 2. Check Component Registration
    console.log('\n🔧 COMPONENT REGISTRATION CHECK:');
    const loginComponentRegistered = customElements.get('login-component');
    console.log('login-component registered:', loginComponentRegistered ? '✅ Yes' : '❌ No');

    // 3. Check Auth Context
    console.log('\n🔐 AUTHENTICATION STATE CHECK:');
    if (typeof window.authContext !== 'undefined') {
        console.log('authContext found in global scope');
        try {
            const state = window.authContext.getState();
            console.log('Auth state:', {
                isAuthenticated: state.isAuthenticated,
                isLoading: state.isLoading,
                user: state.user ? state.user.username : null,
                error: state.error
            });

            if (state.isLoading) {
                console.log('⚠️  Auth context is stuck in loading state!');
                console.log('   This prevents the login container from showing.');
            }
        } catch (error) {
            console.log('❌ Error getting auth state:', error.message);
        }
    } else {
        console.log('❌ authContext not found in global scope');
    }

    // 4. Check for JavaScript Errors
    console.log('\n🐛 JAVASCRIPT ERRORS CHECK:');
    const originalError = window.onerror;
    let errors = [];
    window.onerror = function(message, source, lineno, colno, error) {
        errors.push({ message, source, lineno, colno, error });
        return false;
    };

    // Wait a bit and check for errors
    setTimeout(() => {
        if (errors.length > 0) {
            console.log('❌ Found JavaScript errors:');
            errors.forEach(err => console.log('  ', err.message, 'at', err.source, ':', err.lineno));
        } else {
            console.log('✅ No JavaScript errors detected');
        }
        window.onerror = originalError;
    }, 1000);

    // 5. Try to force show login container
    console.log('\n🔧 ATTEMPTING TO FORCE SHOW LOGIN:');
    if (loginContainer) {
        console.log('Forcing login container to be visible...');
        loginContainer.style.display = 'block';
        loginContainer.style.position = 'fixed';
        loginContainer.style.top = '0';
        loginContainer.style.left = '0';
        loginContainer.style.width = '100%';
        loginContainer.style.height = '100%';
        loginContainer.style.background = 'rgba(0, 0, 0, 0.5)';
        loginContainer.style.zIndex = '9999';
        loginContainer.style.display = 'flex';
        loginContainer.style.alignItems = 'center';
        loginContainer.style.justifyContent = 'center';

        // Create a simple login form if component doesn't exist
        if (!loginContainer.querySelector('login-component')) {
            console.log('Creating fallback login form...');
            const fallbackForm = document.createElement('div');
            fallbackForm.innerHTML = `
                <div style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 400px; width: 100%;">
                    <h2 style="margin-bottom: 20px; text-align: center;">Login</h2>
                    <form id="fallback-login-form">
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Username/Email:</label>
                            <input type="text" id="fallback-username" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 16px;" placeholder="Enter username or email">
                        </div>
                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Password:</label>
                            <input type="password" id="fallback-password" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 4px; font-size: 16px;" placeholder="Enter password">
                        </div>
                        <button type="submit" style="width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;">Login</button>
                    </form>
                    <p id="fallback-message" style="margin-top: 15px; text-align: center; color: #666;"></p>
                </div>
            `;

            loginContainer.innerHTML = '';
            loginContainer.appendChild(fallbackForm);

            // Add event listener for fallback form
            const fallbackFormElement = document.getElementById('fallback-login-form');
            if (fallbackFormElement) {
                fallbackFormElement.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const username = document.getElementById('fallback-username').value;
                    const password = document.getElementById('fallback-password').value;
                    const message = document.getElementById('fallback-message');

                    if (!username || !password) {
                        message.textContent = 'Please enter both username and password';
                        message.style.color = '#dc3545';
                        return;
                    }

                    message.textContent = 'Attempting login...';
                    message.style.color = '#007bff';

                    try {
                        if (typeof window.authContext !== 'undefined') {
                            await window.authContext.login({ username_or_email: username, password: password });
                            message.textContent = 'Login successful!';
                            message.style.color = '#28a745';
                        } else {
                            message.textContent = 'Auth context not available';
                            message.style.color = '#dc3545';
                        }
                    } catch (error) {
                        message.textContent = `Login failed: ${error.message}`;
                        message.style.color = '#dc3545';
                    }
                });
            }

            console.log('✅ Fallback login form created');
        } else {
            console.log('✅ Login component should now be visible');
        }
    } else {
        console.log('❌ Cannot force show - login container not found');
    }

    console.log('\n📋 DIAGNOSIS COMPLETE');
    console.log('================================');
    console.log('If login is now visible, the issue was CSS/styling related.');
    console.log('If still not visible, check the auth state - it might be stuck in loading.');
})();