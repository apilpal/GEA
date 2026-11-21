/**
 * Comprehensive Authentication Debug Script
 * 
 * This script provides detailed debugging for the guest authentication flow
 * to identify exactly where the authentication is failing.
 */

console.log('%c🔍 GUEST AUTHENTICATION DEBUG SCRIPT', 'background: #4CAF50; color: white; padding: 10px; font-weight: bold;');

// Capture all network requests
const originalFetch = window.fetch;
let networkLog = [];

window.fetch = function(...args) {
    const [url, options] = args;
    const startTime = Date.now();
    
    console.log(`🌐 NETWORK REQUEST: ${options?.method || 'GET'} ${url}`);
    console.log('📋 Request options:', options);
    
    const fetchPromise = originalFetch.apply(this, args);
    
    fetchPromise.then(response => {
        const duration = Date.now() - startTime;
        console.log(`✅ NETWORK RESPONSE: ${response.status} ${response.statusText} (${duration}ms)`);
        
        networkLog.push({
            url,
            method: options?.method || 'GET',
            status: response.status,
            statusText: response.statusText,
            duration,
            timestamp: new Date().toISOString()
        });
        
        if (url.includes('/auth/guest') || url.includes('auth')) {
            console.log('🔐 AUTH REQUEST DETECTED - Response headers:', Object.fromEntries(response.headers.entries()));
            
            response.clone().text().then(body => {
                console.log('📄 Response body:', body);
            }).catch(err => {
                console.log('⚠️ Could not read response body:', err);
            });
        }
    }).catch(error => {
        const duration = Date.now() - startTime;
        console.log(`❌ NETWORK ERROR: ${error.message} (${duration}ms)`);
        
        networkLog.push({
            url,
            method: options?.method || 'GET',
            error: error.message,
            duration,
            timestamp: new Date().toISOString()
        });
    });
    
    return fetchPromise;
};

// Monitor localStorage changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    console.log(`💾 localStorage.setItem: ${key} = ${value}`);
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
        console.log('🔐 AUTH STORAGE CHANGE:', { key, value: value.substring(0, 100) + (value.length > 100 ? '...' : '') });
    }
    return originalSetItem.apply(this, arguments);
};

// Monitor authentication context state changes
console.log('🔍 Setting up auth state monitoring...');

// Wait for app to load and then check auth state
setTimeout(() => {
    console.log('🔍 Checking current authentication state...');
    
    // Check if auth context exists
    if (window.authContext) {
        console.log('📊 Auth Context State:', JSON.stringify(window.authContext.getState(), null, 2));
    } else {
        console.log('⚠️ Auth context not found on window object');
    }
    
    // Check localStorage for auth data
    const authKeys = ['auth_user', 'access_token'];
    authKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
            console.log(`💾 Found in localStorage: ${key} = ${value.substring(0, 100)}...`);
        } else {
            console.log(`❌ Not found in localStorage: ${key}`);
        }
    });
    
    // Try to manually trigger guest auth
    console.log('🧪 Attempting manual guest authentication...');
    
    fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({})
    })
    .then(response => {
        console.log('🧪 Manual guest auth response:', response.status, response.statusText);
        return response.json().catch(() => ({ error: 'Could not parse JSON' }));
    })
    .then(data => {
        console.log('🧪 Manual guest auth data:', data);
    })
    .catch(error => {
        console.log('🧪 Manual guest auth error:', error.message);
    });
}, 2000);

// Monitor DOM changes for authentication UI
console.log('🔍 Setting up DOM monitoring...');

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const target = mutation.target;
            if (target.id === 'auth-loading' || target.id === 'login-page' || target.id === 'main-app') {
                console.log(`🎨 DOM Style Change: ${target.id} -> display: ${target.style.display}`);
            }
        }
        
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const target = mutation.target;
            if (target.id === 'login-page' || target.classList.contains('page')) {
                console.log(`🎨 DOM Class Change: ${target.id || target.className} -> classList: ${Array.from(target.classList)}`);
            }
        }
    });
});

// Observe auth-related elements
const authElements = ['auth-loading', 'login-page', 'main-app', 'app'];
authElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
        observer.observe(element, { attributes: true, attributeFilter: ['style', 'class'] });
        console.log(`👁️ Observing element: ${id}`);
    }
});

// Periodic status check
let checkCount = 0;
const maxChecks = 10;
const statusInterval = setInterval(() => {
    checkCount++;
    
    if (checkCount > maxChecks) {
        clearInterval(statusInterval);
        return;
    }
    
    console.log(`🔄 Status Check ${checkCount}/${maxChecks}`);
    
    // Check current page visibility
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const authLoading = document.getElementById('auth-loading');
    
    console.log(`👁️ Current visibility:`);
    console.log(`   Login page: ${loginPage?.style.display || 'not found'}`);
    console.log(`   Main app: ${mainApp?.style.display || 'not found'}`);
    console.log(`   Auth loading: ${authLoading?.style.display || 'not found'}`);
    
    // Check if we're stuck
    if (authLoading?.style.display === 'block') {
        console.log('⏰ Still showing loading - possible hang');
    }
}, 1000);

// Cleanup after 30 seconds
setTimeout(() => {
    console.log('🧹 Cleaning up debug script...');
    clearInterval(statusInterval);
    observer.disconnect();
    
    console.log('📊 Network Log Summary:');
    console.table(networkLog);
    
    console.log('%c🎯 DEBUG SCRIPT COMPLETED', 'background: #2196F3; color: white; padding: 10px; font-weight: bold;');
}, 30000);

console.log('✅ Comprehensive authentication debug script loaded');
console.log('📝 This script will monitor authentication for 30 seconds');
console.log('🔍 Check the console for detailed debugging information');