import { BaseComponent } from '@/ts/components/core/base-component';
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
declare class ChatMessageComponent extends BaseComponent {
    private props;
    private isEditing;
    private editContent;
    constructor(props: ChatMessageProps);
    updateProps(newProps: Partial<ChatMessageProps>): void;
    protected render(): void;
    private renderViewMode;
    private renderEditMode;
    private renderStatusIcon;
    private formatMessageContent;
    protected setupEventListeners(): void;
    private startEditing;
    private cancelEdit;
    private saveEdit;
    private handleDelete;
    private handleRetry;
    private adjustEditTextareaHeight;
    protected updated(): void;
    updateStatus(newStatus: MessageData['status']): void;
    updateContent(newContent: string): void;
    getMessage(): MessageData;
    focus(): void;
}
export { ChatMessageComponent };
export type { ChatMessageProps, MessageData };
//# sourceMappingURL=chat-message-component.d.ts.map