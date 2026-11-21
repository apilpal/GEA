// Chat Message Component - Individual message display
import { BaseComponent } from '@/ts/components/core/base-component';

/**
 * Interface for chat message data
 */
interface MessageData {
    id?: string;
    conversation_id: string;
    message_type: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, any>;
    created_at?: number;
    updated_at?: number;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Props for the chat message component
 */
interface ChatMessageProps {
    message: MessageData;
    showAvatar?: boolean;
    showTimestamp?: boolean;
    showStatus?: boolean;
    compact?: boolean;
    onRetry?: (messageId: string) => void;
    onEdit?: (messageId: string, newContent: string) => void;
    onDelete?: (messageId: string) => void;
}

/**
 * Individual chat message component that displays a single message bubble.
 * Supports different message types (user, assistant, system) with appropriate styling.
 * Includes features like message status, timestamps, and interaction handlers.
 */
class ChatMessageComponent extends BaseComponent {
    private props: ChatMessageProps;
    private isEditing: boolean = false;
    private editContent: string = '';

    constructor(props: ChatMessageProps) {
        super();
        this.props = props;
        this.editContent = props.message.content;
    }

    /**
     * Update component properties
     */
    updateProps(newProps: Partial<ChatMessageProps>) {
        this.props = { ...this.props, ...newProps };
        this.markForRender();
    }

    /**
     * Render the message component
     */
    protected render() {
        const { message, showAvatar = true, showTimestamp = true, showStatus = true, compact = false } = this.props;
        const { message_type, content, status, created_at } = message;

        const isUser = message_type === 'user';
        const isSystem = message_type === 'system';
        const isFailed = status === 'failed';

        const timestamp = created_at ? new Date(created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        const shadow = this.shadowRoot!;
        shadow.innerHTML = `
            <div class="message-wrapper ${isUser ? 'user-message' : 'assistant-message'} ${compact ? 'compact' : ''}">
                ${showAvatar ? `
                    <div class="message-avatar" role="img" aria-label="${isUser ? 'You' : isSystem ? 'System' : 'Assistant'}">
                        ${isUser ? '<icon-user size="20"></icon-user>' :
                          isSystem ? '<icon-info size="20"></icon-info>' :
                          '<icon-bot size="20"></icon-bot>'}
                    </div>
                ` : ''}

                <div class="message-content">
                    <div class="message-bubble ${isFailed ? 'failed' : ''} ${this.isEditing ? 'editing' : ''}">
                        ${this.isEditing ? this.renderEditMode() : this.renderViewMode(content)}

                        ${showTimestamp || showStatus ? `
                            <div class="message-footer">
                                ${showTimestamp ? `<span class="message-time">${timestamp}</span>` : ''}

                                ${showStatus && isUser ? `
                                    <div class="message-status">
                                        ${this.renderStatusIcon(status)}
                                    </div>
                                ` : ''}

                                ${!isSystem && !isFailed ? `
                                    <div class="message-actions">
                                        <button class="action-btn edit-btn" title="Edit message" aria-label="Edit message">
                                            <icon-edit size="12"></icon-edit>
                                        </button>
                                        <button class="action-btn delete-btn" title="Delete message" aria-label="Delete message">
                                            <icon-trash size="12"></icon-trash>
                                        </button>
                                    </div>
                                ` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render message content in view mode
     */
    private renderViewMode(content: string): string {
        const formattedContent = this.formatMessageContent(content);

        return `
            <div class="message-text" dir="auto">
                ${formattedContent}
            </div>
        `;
    }

    /**
     * Render message content in edit mode
     */
    private renderEditMode(): string {
        return `
            <div class="edit-container">
                <textarea class="edit-input" maxlength="1000">${this.editContent}</textarea>
                <div class="edit-actions">
                    <button class="btn btn-primary save-edit-btn">Save</button>
                    <button class="btn btn-secondary cancel-edit-btn">Cancel</button>
                </div>
            </div>
        `;
    }

    /**
     * Render status icon for user messages
     */
    private renderStatusIcon(status?: string): string {
        switch (status) {
            case 'sending':
                return '<icon-clock size="12" class="status-sending"></icon-clock>';
            case 'sent':
                return '<icon-check size="12" class="status-sent"></icon-check>';
            case 'delivered':
                return '<icon-check-all size="12" class="status-delivered"></icon-check>';
            case 'read':
                return '<icon-check-all size="12" class="status-read"></icon-check>';
            case 'failed':
                return '<icon-alert-circle size="12" class="status-failed"></icon-alert-circle>';
            default:
                return '';
        }
    }

    /**
     * Format message content for display
     */
    private formatMessageContent(content: string): string {
        return content
            // Preserve line breaks
            .replace(/\n/g, '<br>')
            // Convert URLs to clickable links
            .replace(
                /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi,
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            )
            // Convert email addresses to mailto links
            .replace(
                /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
                '<a href="mailto:$1">$1</a>'
            )
            // Convert phone numbers to tel links (basic pattern)
            .replace(
                /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
                '<a href="tel:$&">$&</a>'
            );
    }

    /**
     * Set up event listeners for the message component
     */
    protected setupEventListeners() {
        const shadow = this.shadowRoot!;

        // Edit button
        const editBtn = shadow.querySelector('.edit-btn');
        editBtn?.addEventListener('click', () => {
            this.startEditing();
        });

        // Delete button
        const deleteBtn = shadow.querySelector('.delete-btn');
        deleteBtn?.addEventListener('click', () => {
            this.handleDelete();
        });

        // Retry for failed messages
        const retryBtn = shadow.querySelector('.retry-btn');
        retryBtn?.addEventListener('click', () => {
            this.handleRetry();
        });

        // Save edit
        const saveEditBtn = shadow.querySelector('.save-edit-btn');
        saveEditBtn?.addEventListener('click', () => {
            this.saveEdit();
        });

        // Cancel edit
        const cancelEditBtn = shadow.querySelector('.cancel-edit-btn');
        cancelEditBtn?.addEventListener('click', () => {
            this.cancelEdit();
        });

        // Edit input auto-resize
        const editInput = shadow.querySelector('.edit-input') as HTMLTextAreaElement;
        editInput?.addEventListener('input', () => {
            this.adjustEditTextareaHeight(editInput);
        });

        // Handle keyboard shortcuts in edit mode
        if (this.isEditing) {
            editInput?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.saveEdit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.cancelEdit();
                }
            });
        }
    }

    /**
     * Start editing the message
     */
    private startEditing() {
        this.isEditing = true;
        this.markForRender();

        // Focus the edit input after render
        setTimeout(() => {
            const editInput = this.shadowRoot?.querySelector('.edit-input') as HTMLTextAreaElement;
            editInput?.focus();
            editInput?.select();
        }, 0);
    }

    /**
     * Cancel editing mode
     */
    private cancelEdit() {
        this.isEditing = false;
        this.editContent = this.props.message.content;
        this.markForRender();
    }

    /**
     * Save the edited message
     */
    private saveEdit() {
        const newContent = this.editContent.trim();
        if (newContent && newContent !== this.props.message.content) {
            this.props.onEdit?.(this.props.message.id!, newContent);
        }
        this.isEditing = false;
        this.markForRender();
    }

    /**
     * Handle message deletion
     */
    private handleDelete() {
        if (confirm('Are you sure you want to delete this message?')) {
            this.props.onDelete?.(this.props.message.id!);
        }
    }

    /**
     * Handle retry for failed messages
     */
    private handleRetry() {
        this.props.onRetry?.(this.props.message.id!);
    }

    /**
     * Adjust textarea height for edit mode
     */
    private adjustEditTextareaHeight(textarea: HTMLTextAreaElement) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    /**
     * Handle property changes
     */
    protected updated() {
        // Update edit content if message content changed externally
        if (!this.isEditing) {
            this.editContent = this.props.message.content;
        }
    }

    /**
     * Update the message status
     */
    updateStatus(newStatus: MessageData['status']) {
        this.props.message.status = newStatus;
        this.markForRender();
    }

    /**
     * Update the message content
     */
    updateContent(newContent: string) {
        this.props.message.content = newContent;
        if (!this.isEditing) {
            this.editContent = newContent;
        }
        this.markForRender();
    }

    /**
     * Get the current message data
     */
    getMessage(): MessageData {
        return this.props.message;
    }

    /**
     * Focus on the message (for accessibility)
     */
    focus() {
        const messageElement = this.shadowRoot?.querySelector('.message-wrapper');
        if (messageElement instanceof HTMLElement) {
            messageElement.focus();
        }
    }
}

// Export for use in other modules
export { ChatMessageComponent };
export type { ChatMessageProps, MessageData };