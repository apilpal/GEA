import { BaseComponent, ComponentProps, ComponentState, ComponentEventMap } from '@/ts/components/core/base-component';
export interface ChatMessage {
    readonly id?: string;
    readonly conversation_id: string;
    readonly message_type: MessageType;
    readonly content: string;
    readonly metadata?: Readonly<Record<string, any>>;
    readonly created_at?: number;
    readonly updated_at?: number;
    readonly status?: MessageStatus;
    readonly tokens?: number;
    readonly model?: string;
    readonly temperature?: number;
}
export type MessageType = 'user' | 'assistant' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface ChatConversation {
    readonly id?: string;
    readonly user_id?: number;
    readonly title?: string;
    readonly status: ConversationStatus;
    readonly priority: ConversationPriority;
    readonly context_data?: Readonly<Record<string, any>>;
    readonly message_count?: number;
    readonly last_message_at?: number;
    readonly created_at?: number;
    readonly updated_at?: number;
    readonly tags?: readonly string[];
    readonly is_favorite?: boolean;
}
export interface ChatbotComponentProps extends ComponentProps {
    readonly maxConversations?: number;
    readonly maxMessages?: number;
    readonly enableTypingIndicator?: boolean;
    readonly enableMessageCaching?: boolean;
    readonly autoScroll?: boolean;
    readonly showTimestamps?: boolean;
    readonly defaultModel?: string;
    readonly temperature?: number;
    readonly onMessageSent?: (message: ChatMessage) => void;
    readonly onConversationCreated?: (conversation: ChatConversation) => void;
    readonly onError?: (error: Error) => void;
}
export interface ChatbotComponentState extends ComponentState {
    readonly conversations: readonly ChatConversation[];
    readonly currentConversation: ChatConversation | null;
    readonly messages: readonly ChatMessage[];
    readonly isTyping: boolean;
    readonly isLoading: boolean;
    readonly error: string | null;
    readonly messageCache: ReadonlyMap<string, ChatMessage[]>;
    readonly typingUsers: readonly string[];
    readonly connectionStatus: 'connected' | 'disconnected' | 'connecting';
    readonly selectedModel: string;
    readonly temperature: number;
}
export interface ChatbotEventMap extends ComponentEventMap {
    'message-sent': CustomEvent<{
        message: ChatMessage;
    }>;
    'conversation-created': CustomEvent<{
        conversation: ChatConversation;
    }>;
    'conversation-switched': CustomEvent<{
        conversation: ChatConversation;
    }>;
    'typing-started': CustomEvent<{
        userId: string;
    }>;
    'typing-stopped': CustomEvent<{
        userId: string;
    }>;
    'error-occurred': CustomEvent<{
        error: Error;
    }>;
    'connection-changed': CustomEvent<{
        status: string;
    }>;
}
export interface ConversationResponse {
    readonly conversations: readonly ChatConversation[];
    readonly total_count: number;
}
export interface SendMessageRequest {
    readonly conversation_id: string;
    readonly content: string;
    readonly message_type: MessageType;
    readonly metadata?: Readonly<Record<string, any>>;
}
export interface ChatHistoryResponse {
    readonly conversation: ChatConversation;
    readonly messages: readonly ChatMessage[];
    readonly context?: Readonly<Record<string, any>>;
}
declare class ChatbotComponent extends BaseComponent<ChatbotComponentProps, ChatbotComponentState, ChatbotEventMap> {
    private conversations;
    private currentConversation;
    private messages;
    private isTyping;
    private isLoading;
    private messageInput;
    private chatService;
    private messageCache;
    private typingUsers;
    private connectionStatus;
    private typingTimer;
    private typingStartTime;
    private readonly typingTimeout;
    private readonly minTypingTime;
    constructor();
    private initializeChatbot;
    private initializeChatService;
    private getAuthToken;
    private loadConversations;
    private createWelcomeConversation;
    private loadConversationHistory;
    private setupPeriodicUpdates;
    private updateTypingStatus;
    private checkForNewMessages;
    private sendMessage;
    private startTypingIndicator;
    private stopTypingIndicator;
    private showError;
    private createNewConversation;
    private switchConversation;
    private adjustTextareaHeight;
    private scrollToBottom;
    protected performRender(): void;
    private renderLoadingState;
    private renderMessages;
    private renderMessage;
    private formatMessageContent;
    protected setupEventListeners(): void;
    disconnectedCallback(): void;
    setConversation(conversationId: string): void;
    addMessage(content: string, type?: 'user' | 'assistant' | 'system'): void;
}
export { ChatbotComponent };
//# sourceMappingURL=chatbot-component.d.ts.map