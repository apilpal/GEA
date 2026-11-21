export class LoadingComponent extends HTMLElement {
    constructor(message = 'Loading...') {
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
    setMessage(message) {
        const messageEl = this.shadow.querySelector('.message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }
    setVisible(visible) {
        this.style.display = visible ? 'flex' : 'none';
    }
    remove() {
        if (this.parentElement) {
            this.parentElement.removeChild(this);
        }
    }
}
customElements.define('loading-component', LoadingComponent);
//# sourceMappingURL=loading-component.js.map