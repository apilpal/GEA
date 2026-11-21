// Force Authentication Flow Script
// Run this in browser console to manually trigger authentication

(function() {
    console.log('🚀 FORCE AUTHENTICATION FLOW');
    console.log('============================');
    console.log('Timestamp:', new Date().toISOString());

    // 1. Clear any existing state
    console.log('\n🧹 CLEARING EXISTING STATE:');
    try {
        if (typeof window.authContext !== 'undefined') {
            console.log('Clearing auth context state...');
            window.authContext.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
        }

        // Clear localStorage
        const keysToRemove = ['auth_user', 'access_token', 'refresh_token'];
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`   Cleared ${key} from localStorage`);
        });

        // Clear cookies
        document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('token') || name.includes('auth')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                console.log(`   Cleared cookie: ${name}`);
            }
        });

        console.log('✅ State cleared');
    } catch (error) {
        console.log('❌ Error clearing state:', error.message);
    }

    // 2. Test API connectivity
    console.log('\n🌐 TESTING API CONNECTIVITY:');
    fetch('/api/auth/guest', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => {
        console.log('Guest API response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        return response.json();
    })
    .then(data => {
        console.log('✅ Guest API response:', JSON.stringify(data, null, 2));

        if (data.access_token) {
            console.log('✅ Guest user created successfully');
            console.log('   Username:', data.user.username);
            console.log('   Is Guest:', data.user.is_guest);
            console.log('   Role:', data.user.role);

            // 3. Test authenticated API access
            console.log('\n🔐 TESTING AUTHENTICATED ACCESS:');
            return fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } else {
            console.log('❌ Guest API did not return access token');
            throw new Error('No access token received');
        }
    })
    .then(response => {
        console.log('Auth API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Auth API response:', JSON.stringify(data, null, 2));

        // 4. Test guest dashboard
        console.log('\n📊 TESTING GUEST DASHBOARD:');
        return fetch('/api/auth/guest/dashboard', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    })
    .then(response => {
        console.log('Dashboard API response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('✅ Dashboard API response:', JSON.stringify(data, null, 2));
        console.log('   Total Drivers:', data.summary?.total_drivers);
        console.log('   Total Students:', data.summary?.total_students);

        // 5. Force frontend auth context update
        console.log('\n🔄 UPDATING FRONTEND AUTH CONTEXT:');
        if (typeof window.authContext !== 'undefined') {
            console.log('Setting auth context to authenticated state...');
            window.authContext.setState({
                user: data.user || { username: 'guest_test', is_guest: true, role: 'student' },
                isAuthenticated: true,
                isLoading: false,
                error: null
            });

            const newState = window.authContext.getState();
            console.log('✅ New auth state:', JSON.stringify(newState, null, 2));

            // 6. Force navigation to dashboard
            console.log('\n🧭 FORCING DASHBOARD NAVIGATION:');
            window.location.hash = 'dashboard';
            console.log('✅ Hash changed to dashboard');

            // 7. Force UI update
            setTimeout(() => {
                console.log('\n🎨 FORCING UI UPDATE:');
                const loginPage = document.getElementById('login-page');
                const mainApp = document.getElementById('main-app');
                const authLoading = document.getElementById('auth-loading');

                if (loginPage) loginPage.classList.remove('active');
                if (mainApp) mainApp.style.display = 'block';
                if (authLoading) authLoading.style.display = 'none';

                console.log('✅ UI elements updated');
                console.log('   Login page active:', loginPage ? loginPage.classList.contains('active') : 'N/A');
                console.log('   Main app display:', mainApp ? getComputedStyle(mainApp).display : 'N/A');
                console.log('   Auth loading display:', authLoading ? getComputedStyle(authLoading).display : 'N/A');

                // 8. Check final state
                console.log('\n📋 FINAL STATE CHECK:');
                const finalAuthState = window.authContext.getState();
                console.log('Final auth state:', JSON.stringify(finalAuthState, null, 2));
                console.log('Current URL hash:', window.location.hash);

                document.querySelectorAll('.page').forEach(page => {
                    console.log(`Page ${page.id}: active=${page.classList.contains('active')}, display=${getComputedStyle(page).display}`);
                });

                console.log('\n🎉 FORCE AUTHENTICATION COMPLETE');
                console.log('=====================================');
                console.log('If dashboard is now visible, the issue was in the initial auth flow.');
                console.log('If still not visible, check for JavaScript errors or component issues.');
            }, 1000);

        } else {
            console.log('❌ Dashboard API did not return expected data');
        }
    })
    .catch(error => {
        console.log('❌ API call failed:', error.message);
        console.log('Error stack:', error.stack);

        // Fallback: Try to manually show login
        console.log('\n🔧 FALLBACK: SHOWING LOGIN PAGE');
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');
        const authLoading = document.getElementById('auth-loading');

        if (loginPage) {
            loginPage.classList.add('active');
            console.log('✅ Login page activated');
        }
        if (mainApp) {
            mainApp.style.display = 'none';
            console.log('✅ Main app hidden');
        }
        if (authLoading) {
            authLoading.style.display = 'none';
            console.log('✅ Auth loading hidden');
        }

        if (typeof window.authContext !== 'undefined') {
            window.authContext.setState({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null
            });
            console.log('✅ Auth context set to login state');
        }
    });
})();