// Error handling utilities for consistent error management

/**
 * Custom error class for application-specific errors with additional metadata.
 */

/** Escape untrusted values before interpolating them into HTML templates. */
function escapeHtml(value: unknown): string {
    return String(value ?? '').replace(/[&<>\"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]!);
}

export class AppError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly statusCode?: number
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Handles API errors by displaying appropriate toast messages and logging.
 * @param {unknown} error - The error that occurred.
 * @param {string} context - Description of where the error occurred for better logging.
 */
export function handleApiError(error: unknown, context: string): void {
    if (error instanceof AppError) {
        showErrorToast(`${context}: ${escapeHtml(error.message)}`);
        console.error(`[${context}] AppError:`, error);
    } else if (error instanceof Error) {
        showErrorToast(`${context}: ${escapeHtml(error.message)}`);
        console.error(`[${context}] Error:`, error);
    } else {
        showErrorToast(`${context}: An unexpected error occurred`);
        console.error(`[${context}] Unknown error:`, error);
    }
}

/**
 * Wraps an async operation with error handling and optional success/error callbacks.
 * @param {function(): Promise<T>} operation - The async operation to execute.
 * @param {string} context - Description of the operation for error reporting.
 * @param {function(T): void} onSuccess - Optional callback for successful operations.
 * @param {function(unknown): void} onError - Optional callback for error handling.
 * @returns {Promise<T | void>} Promise that resolves with the operation result or void on error.
 */
export function handleAsyncOperation<T>(
    operation: () => Promise<T>,
    context: string,
    onSuccess?: (result: T) => void,
    onError?: (error: unknown) => void
): Promise<T | void> {
    return operation()
        .then(result => {
            onSuccess?.(result);
            return result;
        })
        .catch(error => {
            handleApiError(error, context);
            onError?.(error);
        });
}

/**
 * Displays an error toast notification with the specified message.
 * @param {string} message - The error message to display.
 */
export function showErrorToast(message: string): void {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-error';

    toast.innerHTML = `
        <icon-exclamation-circle size="16"></icon-exclamation-circle>
        <span>${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

/**
 * Displays a success toast notification with the specified message.
 * @param {string} message - The success message to display.
 */
export function showSuccessToast(message: string): void {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-success';

    toast.innerHTML = `
        <icon-check-circle size="16"></icon-check-circle>
        <span>${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

/**
 * Displays an info toast notification with the specified message.
 * @param {string} message - The info message to display.
 */
export function showInfoToast(message: string): void {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-info';

    toast.innerHTML = `
        <icon-info-circle size="16"></icon-info-circle>
        <span>${escapeHtml(message)}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}