// Custom Icon Components - Remove external FontAwesome dependency

/** Properties interface for icon components. */
interface IconProps {
    /** Size of the icon in pixels. */
    size?: number;
    /** Color of the icon. */
    color?: string;
    /** Additional CSS class for styling. */
    className?: string;
}

/**
 * Abstract base class for custom icon web components.
 * Provides common functionality for rendering SVG icons with configurable size and color.
 */
class IconBase extends HTMLElement {
    /** The size of the icon in pixels. */
    public size: number = 24;
    /** The color of the icon. */
    public color: string = 'currentColor';
    /** Additional CSS class for the icon. */
    public className: string = '';

    /**
     * Abstract render method to be implemented by subclasses.
     * Each icon component must define its own SVG rendering.
     */
    render(): void {
        // Base render method - implemented by subclasses
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    /**
     * Lifecycle callback when component is connected to DOM.
     * Initializes icon properties from attributes and renders the icon.
     */
    connectedCallback() {
        this.size = parseInt(this.getAttribute('size') || '24');
        this.color = this.getAttribute('color') || 'currentColor';
        this.className = this.getAttribute('class') || '';
        this.render();
    }

    /**
     * Renders the icon with standard styling and the provided SVG content.
     * @param {string} svgContent - The SVG markup for the specific icon.
     */
    protected renderIcon(svgContent: string): void {
        const style = `
            <style>
                :host {
                    display: inline-block;
                    width: ${this.size}px;
                    height: ${this.size}px;
                    color: ${this.color};
                    --icon-transition: all 0.3s ease;
                    transition: var(--icon-transition);
                }
                :host(:hover) {
                    transform: scale(1.05);
                }
                svg {
                    width: 100%;
                    height: 100%;
                    fill: currentColor;
                    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
                }
                .icon-path {
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
            </style>
        `;

        if (this.shadowRoot) {
            this.shadowRoot.innerHTML = style + svgContent;
        }
    }
}

// School Icon - Enhanced with better SVG structure
class SchoolIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path class="icon-path" d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="none" stroke="currentColor"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Robot Icon
class RobotIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L19 6.6C18.8 5.6 18.2 4.7 17.4 4.2L18 2.5L16.5 1L14.8 1.6C14.3 0.8 13.4 0.2 12.4 0L12 2L12.6 4C11.6 4.2 10.7 4.8 10.2 5.6L8.5 5L7 6.5L7.6 8.2C6.8 8.7 6.2 9.6 6 10.6L4 11V13L6 13.4C6.2 14.4 6.8 15.3 7.6 15.8L7 17.5L8.5 19L10.2 18.4C10.7 19.2 11.6 19.8 12.6 20L13 22L15 22L15.4 20C16.4 19.8 17.3 19.2 17.8 18.4L19.5 19L21 17.5L20.4 15.8C21.2 15.3 21.8 14.4 22 13.4L24 13V11L22 10.6C21.8 9.6 21.2 8.7 20.4 7.4L21 5.5L19.5 4L17.8 4.6C17.3 3.8 16.4 3.2 15.4 3L15 1L13 1L12.6 3C11.6 3.2 10.7 3.8 10.2 4.6L8.5 4L7 5.5L7.6 7.2C6.8 7.7 6.2 8.6 6 9.6L4 10V12L6 12.4C6.2 13.4 6.8 14.3 7.6 14.8L7 16.5L8.5 17L10.2 16.4C10.7 17.2 11.6 17.8 12.6 18L13 20L15 20L15.4 18C16.4 17.8 17.3 17.2 17.8 16.4L19.5 17L21 15.5L20.4 13.8C21.2 13.3 21.8 12.4 22 11.4L24 11V9H21Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Bus Icon
class BusIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V21A1,1 0 0,0 6,22H7A1,1 0 0,0 8,21V20H16V21A1,1 0 0,0 17,22H18A1,1 0 0,0 19,21V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Users Icon
class UsersIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 17V19H2V17S2 13 9 13 16 17 16 17M12.5 7.5A3.5 3.5 0 1 0 9 11A3.5 3.5 0 0 0 12.5 7.5M15.94 13A5.32 5.32 0 0 1 18 17V19H22V17S22 13.37 15.94 13M15 4A3.39 3.39 0 0 0 13.07 4.59A5 5 0 0 1 15.41 6.41A3.39 3.39 0 0 0 15 10A3.5 3.5 0 0 0 15 4Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Chart Bar Icon
class ChartBarIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Chart Line Icon
class ChartLineIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Cog/Settings Icon
class CogIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.47,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.53,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.53,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.47,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// User Circle Icon
class UserCircleIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2M21,9V7L19,6.6C18.8,5.6 18.2,4.7 17.4,4.2L18,2.5L16.5,1L14.8,1.6C14.3,0.8 13.4,0.2 12.4,0L12,2L12.6,4C11.6,4.2 10.7,4.8 10.2,5.6L8.5,5L7,6.5L7.6,8.2C6.8,8.7 6.2,9.6 6,10.6L4,11V13L6,13.4C6.2,14.4 6.8,15.3 7.6,15.8L7,17.5L8.5,19L10.2,18.4C10.7,19.2 11.6,19.8 12.6,20L13,22L15,22L15.4,20C16.4,19.8 17.3,19.2 17.8,18.4L19.5,19L21,17.5L20.4,15.8C21.2,15.3 21.8,14.4 22,13.4L24,13V11L22,10.6C21.8,9.6 21.2,8.7 20.4,7.4L21,5.5L19.5,4L17.8,4.6C17.3,3.8 16.4,3.2 15.4,3L15,1L13,1L12.6,3C11.6,3.2 10.7,3.8 10.2,4.6L8.5,4L7,5.5L7.6,7.2C6.8,7.7 6.2,8.6 6,9.6L4,10V12L6,12.4C6.2,13.4 6.8,14.3 7.6,14.8L7,16.5L8.5,17L10.2,16.4C10.7,17.2 11.6,17.8 12.6,18L13,20L15,20L15.4,18C16.4,17.8 17.3,17.2 17.8,16.4L19.5,17L21,15.5L20.4,13.8C21.2,13.3 21.8,12.4 22,11.4L24,11V9H21Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Sign Out Icon
class SignOutIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Bars/Hamburger Icon
class BarsIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Bell Icon
class BellIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M10,21H14A2,2 0 0,0 16,19V10A6,6 0 0,1 22,4H2A6,6 0 0,1 8,10V19A2,2 0 0,0 10,21M19,4A2,2 0 0,0 17,6H7A2,2 0 0,0 5,4H19Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Search Icon
class SearchIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Plus Icon
class PlusIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// User Plus Icon
class UserPlusIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15,14C12.33,14 7,15.33 7,18V20H23V18C23,15.33 17.67,14 15,14M6,10V7H4V10H1V12H4V15H6V12H9V10M15,12A4,4 0 0,0 19,8A4,4 0 0,0 15,4A4,4 0 0,0 11,8A4,4 0 0,0 15,12Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// File Alt Icon
class FileAltIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Times/Close Icon
class TimesIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Paper Plane Icon
class PaperPlaneIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Route Icon
class RouteIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.92,6.01C18.72,5.42 18.16,5 17.5,5H15V3H9V5H6.5C5.84,5 5.29,5.42 5.08,6.01L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V18H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6.01M7.5,7A1.5,1.5 0 0,1 9,8.5A1.5,1.5 0 0,1 7.5,10A1.5,1.5 0 0,1 6,8.5A1.5,1.5 0 0,1 7.5,7M16.5,7A1.5,1.5 0 0,1 18,8.5A1.5,1.5 0 0,1 16.5,10A1.5,1.5 0 0,1 15,8.5A1.5,1.5 0 0,1 16.5,7M5,13A1,1 0 0,1 6,12A1,1 0 0,1 7,13A1,1 0 0,1 6,14A1,1 0 0,1 5,13M17,13A1,1 0 0,1 18,12A1,1 0 0,1 19,13A1,1 0 0,1 18,14A1,1 0 0,1 17,13Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Spinner Icon
class SpinnerIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Dollar Sign Icon
class DollarSignIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15C15,13.9 13.96,13.5 11.76,12.97C9.64,12.44 7,11.78 7,9C7,7.21 8.47,5.69 10.5,5.18V3H13.5V5.18C15.53,5.69 17,7.21 17,9H15C15,7.92 13.63,7 12,7C10.37,7 9,7.92 9,9C9,10.1 10.04,10.5 12.24,11.03C14.36,11.56 17,12.22 17,15C17,16.79 15.53,18.31 13.5,18.82V21H10.5V18.82C8.47,18.31 7,16.79 7,15Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Sync Icon
class SyncIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12,18A6,6 0 0,1 6,12C6,11 6.25,10.03 6.7,9.2L5.24,7.74C4.46,9.03 4,10.47 4,12A8,8 0 0,0 12,20V23L16,19L12,15M12,4V1L8,5L12,9V6A6,6 0 0,1 18,12C18,13 17.75,13.97 17.3,14.8L18.76,16.26C19.54,14.97 20,13.53 20,12A8,8 0 0,0 12,4Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Download Icon
class DownloadIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Chart Pie Icon
class ChartPieIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11,2V22C5.9,21.1 2,16.8 2,12C2,7.2 5.9,2.9 11,2M13,2V11H22C21.1,5.9 16.8,2 12,2C13.1,2 13,2 13,2M13,13V22C18.1,21.1 22,16.8 22,12C22,13.1 22,13 22,13H13Z"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Eye Icon (View)
class EyeIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M3.18,12C4.83,15.36 8.24,17.5 12,17.5C15.76,17.5 19.17,15.36 20.82,12C19.17,8.64 15.76,6.5 12,6.5C8.24,6.5 4.83,8.64 3.18,12Z" fill="none" stroke="currentColor"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Edit Icon (Pencil)
class EditIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" fill="none" stroke="currentColor"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Trash Icon (Delete)
class TrashIcon extends IconBase {
    render(): void {
        const svg = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" fill="none" stroke="currentColor"/>
            </svg>
        `;
        this.renderIcon(svg);
    }
}

// Register custom icon components
customElements.define('icon-school', SchoolIcon);
customElements.define('icon-robot', RobotIcon);
customElements.define('icon-bus', BusIcon);
customElements.define('icon-users', UsersIcon);
customElements.define('icon-chart-bar', ChartBarIcon);
customElements.define('icon-chart-line', ChartLineIcon);
customElements.define('icon-cog', CogIcon);
customElements.define('icon-user-circle', UserCircleIcon);
customElements.define('icon-sign-out', SignOutIcon);
customElements.define('icon-bars', BarsIcon);
customElements.define('icon-bell', BellIcon);
customElements.define('icon-search', SearchIcon);
customElements.define('icon-plus', PlusIcon);
customElements.define('icon-user-plus', UserPlusIcon);
customElements.define('icon-file-alt', FileAltIcon);
customElements.define('icon-times', TimesIcon);
customElements.define('icon-paper-plane', PaperPlaneIcon);
customElements.define('icon-route', RouteIcon);
customElements.define('icon-spinner', SpinnerIcon);
customElements.define('icon-dollar-sign', DollarSignIcon);
customElements.define('icon-sync', SyncIcon);
customElements.define('icon-download', DownloadIcon);
customElements.define('icon-chart-pie', ChartPieIcon);
customElements.define('icon-eye', EyeIcon);
customElements.define('icon-edit', EditIcon);
customElements.define('icon-trash', TrashIcon);

console.log('Custom icon components loaded');