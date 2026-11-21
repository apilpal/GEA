/**
 * Theme System Integration Example
 * Demonstrates how to integrate the theme system into an application
 */

import { initializeThemeSystem, ThemeComponents } from '@/ts/components/theme';
import { Theme } from '@/ts/services/theme-service';

// Example 1: Basic Application Setup
export class ThemeIntegrationExample {
    private app: HTMLElement;

    constructor() {
        this.app = document.createElement('div');
        this.app.className = 'example-app';
        document.body.appendChild(this.app);
    }

    /**
     * Initialize the complete theme system
     */
    async initialize(): Promise<void> {
        try {
            // 1. Initialize theme system
            console.log('Initializing theme system...');
            await initializeThemeSystem();

            // 2. Setup application structure
            this.setupAppStructure();

            // 3. Add theme toggle
            this.addThemeToggle();

            // 4. Demonstrate programmatic control
            this.setupProgrammaticControl();

            // 5. Test theme functionality
            this.testThemeFunctionality();

            console.log('Theme system initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize theme system:', error);
        }
    }

    /**
     * Setup basic application structure
     */
    private setupAppStructure(): void {
        this.app.innerHTML = `
            <header class="app-header">
                <h1>Theme System Example</h1>
                <nav class="nav-controls">
                    <!-- Theme toggle will be inserted here -->
                </nav>
            </header>

            <main class="app-main">
                <section class="demo-section">
                    <h2>Theme Demo</h2>
                    <p>This section demonstrates theme-aware styling.</p>

                    <div class="demo-cards">
                        <div class="demo-card">
                            <h3>Card Title</h3>
                            <p>Card content with theme-aware colors</p>
                            <button class="demo-button">Action Button</button>
                        </div>

                        <div class="demo-card demo-card--elevated">
                            <h3>Elevated Card</h3>
                            <p>This card has elevated styling</p>
                            <button class="demo-button demo-button--primary">Primary Button</button>
                        </div>
                    </div>
                </section>

                <section class="controls-section">
                    <h2>Programmatic Controls</h2>
                    <div class="control-buttons">
                        <button id="setLightBtn" class="control-btn">Set Light</button>
                        <button id="setDarkBtn" class="control-btn">Set Dark</button>
                        <button id="toggleBtn" class="control-btn">Toggle</button>
                        <button id="resetBtn" class="control-btn">Reset</button>
                    </div>
                </section>
            </main>
        `;

        // Add theme-aware styles
        this.addDemoStyles();
    }

    /**
     * Add theme toggle component
     */
    private addThemeToggle(): void {
        const navControls = this.app.querySelector('.nav-controls');
        if (navControls) {
            const themeToggle = document.createElement('theme-toggle');
            themeToggle.setAttribute('size', 'md');
            themeToggle.setAttribute('variant', 'icon');
            themeToggle.setAttribute('show-label', 'false');
            themeToggle.setAttribute('aria-label', 'Toggle theme');
            navControls.appendChild(themeToggle);
        }
    }

    /**
     * Setup programmatic theme control
     */
    private setupProgrammaticControl(): void {
        // Set light theme button
        const setLightBtn = this.app.querySelector('#setLightBtn');
        setLightBtn?.addEventListener('click', () => {
            Theme.set('light');
        });

        // Set dark theme button
        const setDarkBtn = this.app.querySelector('#setDarkBtn');
        setDarkBtn?.addEventListener('click', () => {
            Theme.set('dark');
        });

        // Toggle theme button
        const toggleBtn = this.app.querySelector('#toggleBtn');
        toggleBtn?.addEventListener('click', () => {
            Theme.toggle();
        });

        // Reset theme button
        const resetBtn = this.app.querySelector('#resetBtn');
        resetBtn?.addEventListener('click', () => {
            Theme.reset();
        });
    }

    /**
     * Test theme functionality
     */
    private testThemeFunctionality(): void {
        // Test theme service functionality
        console.log('Current theme:', Theme.getCurrent());
        console.log('Reduced motion:', Theme.isReducedMotion());
        console.log('High contrast:', Theme.isHighContrast());

        // Test theme change listener
        const unsubscribe = Theme.onChange((theme) => {
            console.log('Theme changed to:', theme);
            this.updateDemoContent(theme);
        });

        // Test theme preview
        const lightPreview = Theme.createPreview('light');
        const darkPreview = Theme.createPreview('dark');
        console.log('Theme previews created');

        // Test configuration export/import
        const configJson = Theme.exportConfig();
        console.log('Theme config exported:', configJson);
    }

    /**
     * Update demo content based on theme
     */
    private updateDemoContent(theme: 'light' | 'dark'): void {
        const demoSection = this.app.querySelector('.demo-section p');
        if (demoSection) {
            demoSection.textContent = `Currently displaying ${theme} theme with smooth transitions!`;
        }
    }

    /**
     * Add demonstration styles
     */
    private addDemoStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .example-app {
                min-height: 100vh;
                background-color: var(--color-background);
                color: var(--color-text);
                transition: background-color var(--transition-base), color var(--transition-base);
            }

            .app-header {
                background-color: var(--color-surface-elevated);
                padding: 1rem 2rem;
                box-shadow: var(--shadow-md);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .app-header h1 {
                margin: 0;
                color: var(--color-primary);
            }

            .app-main {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
            }

            .demo-section h2,
            .controls-section h2 {
                color: var(--color-text);
                border-bottom: 2px solid var(--color-border);
                padding-bottom: 0.5rem;
            }

            .demo-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 2rem;
                margin: 2rem 0;
            }

            .demo-card {
                background-color: var(--color-card-background);
                border: 1px solid var(--color-border);
                border-radius: var(--border-radius-lg);
                padding: 1.5rem;
                box-shadow: var(--shadow-sm);
                transition: transform var(--transition-base), box-shadow var(--transition-base);
            }

            .demo-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-md);
            }

            .demo-card--elevated {
                box-shadow: var(--shadow-lg);
            }

            .demo-card h3 {
                margin-top: 0;
                color: var(--color-primary);
            }

            .demo-card p {
                color: var(--color-text-muted);
                margin-bottom: 1rem;
            }

            .demo-button {
                background-color: var(--color-surface);
                color: var(--color-text);
                border: 1px solid var(--color-border);
                padding: 0.5rem 1rem;
                border-radius: var(--border-radius-md);
                cursor: pointer;
                transition: all var(--transition-base);
            }

            .demo-button:hover {
                background-color: var(--color-primary);
                color: var(--color-text-inverse);
            }

            .demo-button--primary {
                background-color: var(--color-primary);
                color: var(--color-text-inverse);
            }

            .demo-button--primary:hover {
                opacity: 0.9;
            }

            .controls-section {
                margin-top: 3rem;
                padding: 2rem;
                background-color: var(--color-surface);
                border-radius: var(--border-radius-lg);
                box-shadow: var(--shadow-sm);
            }

            .control-buttons {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                margin-top: 1rem;
            }

            .control-btn {
                background-color: var(--color-primary);
                color: var(--color-text-inverse);
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: var(--border-radius-md);
                cursor: pointer;
                transition: opacity var(--transition-base);
                font-weight: 500;
            }

            .control-btn:hover {
                opacity: 0.9;
            }

            .control-btn:active {
                transform: translateY(1px);
            }

            /* Focus styles for accessibility */
            .control-btn:focus,
            .demo-button:focus {
                outline: var(--focus-ring-width) solid var(--focus-ring-color);
                outline-offset: 2px;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .app-header {
                    flex-direction: column;
                    gap: 1rem;
                    text-align: center;
                }

                .demo-cards {
                    grid-template-columns: 1fr;
                }

                .control-buttons {
                    justify-content: center;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Cleanup example
     */
    public destroy(): void {
        if (this.app && this.app.parentNode) {
            this.app.parentNode.removeChild(this.app);
        }
    }
}

// Example 2: Simple Usage Function
export async function simpleThemeExample(): Promise<void> {
    // Initialize theme system
    await initializeThemeSystem();

    // Create a simple toggle button
    const toggleButton = document.createElement('button');
    toggleButton.innerHTML = '🌙 Toggle Theme';
    toggleButton.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: var(--color-primary);
        color: var(--color-text-inverse);
        border: none;
        border-radius: 25px;
        cursor: pointer;
        font-size: 14px;
        z-index: 1000;
        transition: all var(--transition-base);
    `;

    // Add toggle functionality
    toggleButton.addEventListener('click', () => {
        Theme.toggle();
    });

    // Listen for theme changes
    Theme.onChange((theme) => {
        toggleButton.innerHTML = theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    });

    document.body.appendChild(toggleButton);

    console.log('Simple theme example initialized!');
}

// Example 3: Component Integration
export function integrateWithExistingComponents(): void {
    // This function demonstrates how to integrate theme system
    // with existing components in your application

    const existingButtons = document.querySelectorAll('.existing-button');
    existingButtons.forEach(button => {
        // Add theme-aware styling to existing buttons
        button.classList.add('bg-primary', 'text-inverse');

        // Add focus styles
        button.classList.add('focus-ring');
    });

    const existingCards = document.querySelectorAll('.existing-card');
    existingCards.forEach(card => {
        // Add theme-aware styling to existing cards
        card.classList.add('bg-surface', 'card');
    });

    console.log(`Integrated theme system with ${existingButtons.length} buttons and ${existingCards.length} cards`);
}

// Auto-run example in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Theme System Integration Example');
            console.log('Check THEME_SYSTEM_README.md for complete documentation');
        });
    } else {
        console.log('Theme System Integration Example loaded');
    }
}