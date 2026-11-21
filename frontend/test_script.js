// Legacy JavaScript tests for compatibility
// This file is kept for backward compatibility but TypeScript tests are preferred

// Simple compatibility test
function runCompatibilityTest() {
    console.log("Legacy JavaScript tests - use TypeScript tests instead");

    // Basic DOM manipulation test
    const testElement = document.createElement('div');
    testElement.textContent = 'Test Element';
    testElement.className = 'test-element';

    // Test modern JS features
    const testPromise = Promise.resolve('Test Promise');
    testPromise.then(result => {
        console.log('Promise test passed:', result);
    });

    // Test async/await compatibility
    async function testAsync() {
        try {
            const result = await Promise.resolve('Async test');
            console.log('Async/await test passed:', result);
        } catch (error) {
            console.error('Async/await test failed:', error);
        }
    }

    testAsync();
}

// Run test if in browser environment
if (typeof window !== 'undefined') {
    runCompatibilityTest();
}

module.exports = { runCompatibilityTest };