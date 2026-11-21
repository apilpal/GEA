console.log('=== LOGIN COMPONENT DEBUGGING ===');
console.log('Timestamp:', new Date().toISOString());

// Check if login component exists in DOM
const loginComponent = document.querySelector('login-component');
console.log('Login component element:', loginComponent);
if (loginComponent) {
    console.log('Login component tag name:', loginComponent.tagName);
    console.log('Login component id:', loginComponent.id);
    console.log('Login component shadow root:', loginComponent.shadowRoot);
    if (loginComponent.shadowRoot) {
        console.log('Login component shadow HTML:', loginComponent.shadowRoot.innerHTML);
    }
} else {
    console.log('❌ Login component NOT found in DOM');
}

// Check login container
const loginContainer = document.getElementById('login-container');
console.log('Login container element:', loginContainer);
if (loginContainer) {
    console.log('Login container display style:', loginContainer.style.display);
    console.log('Login container visibility:', loginContainer.style.visibility);
    console.log('Login container children:', loginContainer.children);
    console.log('Login container innerHTML:', loginContainer.innerHTML);
} else {
    console.log('❌ Login container NOT found');
}

// Check login page
const loginPage = document.getElementById('login-page');
console.log('Login page element:', loginPage);
if (loginPage) {
    console.log('Login page class list:', loginPage.classList.toString());
    console.log('Login page display style:', loginPage.style.display);
    console.log('Login page visibility:', loginPage.style.visibility);
    console.log('Login page computed display:', window.getComputedStyle(loginPage).display);
    console.log('Login page active class:', loginPage.classList.contains('active'));
} else {
    console.log('❌ Login page NOT found');
}

// Check main app visibility
const mainApp = document.getElementById('main-app');
console.log('Main app element:', mainApp);
if (mainApp) {
    console.log('Main app display style:', mainApp.style.display);
    console.log('Main app visibility:', mainApp.style.visibility);
} else {
    console.log('❌ Main app NOT found');
}

// Check auth loading
const authLoading = document.getElementById('auth-loading');
console.log('Auth loading element:', authLoading);
if (authLoading) {
    console.log('Auth loading display style:', authLoading.style.display);
} else {
    console.log('❌ Auth loading NOT found');
}

// Check current URL hash
console.log('Current URL hash:', window.location.hash);

// Check page visibility classes
document.querySelectorAll('.page').forEach(page => {
    console.log(`Page ${page.id}: classes=${page.classList.toString()}, display=${window.getComputedStyle(page).display}`);
});

// Check authentication state from auth context
if (window.authContext) {
    const authState = window.authContext.getState();
    console.log('Auth context state:', authState);
} else {
    console.log('❌ Auth context not available on window');
}

// Check if login-component is registered
console.log('Custom elements registry:', customElements.get('login-component'));

console.log('=== END DEBUGGING ===');
