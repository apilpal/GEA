export class AppError extends Error {
    constructor(message, code, statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
export function handleApiError(error, context) {
    if (error instanceof AppError) {
        showErrorToast(`${context}: ${error.message}`);
        console.error(`[${context}] AppError:`, error);
    }
    else if (error instanceof Error) {
        showErrorToast(`${context}: ${error.message}`);
        console.error(`[${context}] Error:`, error);
    }
    else {
        showErrorToast(`${context}: An unexpected error occurred`);
        console.error(`[${context}] Unknown error:`, error);
    }
}
export function handleAsyncOperation(operation, context, onSuccess, onError) {
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
export function showErrorToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer)
        return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `
        <icon-exclamation-circle size="16"></icon-exclamation-circle>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
export function showSuccessToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer)
        return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `
        <icon-check-circle size="16"></icon-check-circle>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
export function showInfoToast(message) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer)
        return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-info';
    toast.innerHTML = `
        <icon-info-circle size="16"></icon-info-circle>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <icon-times size="12"></icon-times>
        </button>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}
//# sourceMappingURL=error-handler.js.map