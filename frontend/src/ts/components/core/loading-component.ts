// Loading Component for dynamic imports and async operations

/**
 * A reusable loading component that shows a spinner with optional message.
 * Used during dynamic imports and other async operations.
 */
export class LoadingComponent extends HTMLElement {
    private shadow: ShadowRoot;

    constructor(message: string = 'Loading...') {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });

        const template = document.createElement('template');
        template.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    color: #666;
                    font-family: Arial, sans-serif;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                .message {
                    font-size: 0.9rem;
                    text-align: center;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .hidden {
                    display: none;
                }
            </style>
            <div class="loading-container">
                <icon-spinner class="spinner" size="24"></icon-spinner>
                <span class="message">${message}</span>
            </div>
        `;

        this.shadow.appendChild(template.content.cloneNode(true));
    }

    /**
     * Updates the loading message.
     */
    setMessage(message: string): void {
        const messageEl = this.shadow.querySelector('.message') as HTMLElement;
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    /**
     * Shows or hides the loading component.
     */
    setVisible(visible: boolean): void {
        this.style.display = visible ? 'flex' : 'none';
    }

    /**
     * Removes the loading component from the DOM.
     */
    remove(): void {
        if (this.parentElement) {
            this.parentElement.removeChild(this);
        }
    }
}

// Register the custom element
customElements.define('loading-component', LoadingComponent);