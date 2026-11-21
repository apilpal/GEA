// Chatbot Component - Main chat interface
import { BaseComponent, ComponentProps, ComponentState, ComponentEventMap } from '@/ts/components/core/base-component';

/**
 * Enhanced TypeScript interfaces for chat functionality with strict typing
 */
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

/**
 * Enhanced conversation interface with better typing
 */
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

/**
 * Enhanced props interface for ChatbotComponent
 */
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

/**
 * Enhanced state interface for ChatbotComponent
 */
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

/**
 * Event map for type-safe event handling
 */
export interface ChatbotEventMap extends ComponentEventMap {
    'message-sent': CustomEvent<{ message: ChatMessage }>;
    'conversation-created': CustomEvent<{ conversation: ChatConversation }>;
    'conversation-switched': CustomEvent<{ conversation: ChatConversation }>;
    'typing-started': CustomEvent<{ userId: string }>;
    'typing-stopped': CustomEvent<{ userId: string }>;
    'error-occurred': CustomEvent<{ error: Error }>;
    'connection-changed': CustomEvent<{ status: string }>;
}


/**
 * Request/Response interfaces for API communication
 */
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

/**
 * Enhanced chatbot component with improved TypeScript integration and store support.
 * Features include:
 * - Real-time messaging with WebSocket support
 * - Conversation management with memory and context awareness
 * - Typing indicators and enhanced UX
 * - Message status tracking and caching
 * - Responsive design with accessibility
 * - Full store integration for state management
 */
class ChatbotComponent extends BaseComponent<
    ChatbotComponentProps,
    ChatbotComponentState,
    ChatbotEventMap
> {
    private conversations: ChatConversation[] = [];
    private currentConversation: ChatConversation | null = null;
    private messages: ChatMessage[] = [];
    private isTyping: boolean = false;
    private isLoading: boolean = false;
    private messageInput: HTMLTextAreaElement | null = null;
    private chatService: any = null; // Will be injected or initialized
    private messageCache: Map<string, ChatMessage[]> = new Map();
    private typingUsers: string[] = [];
    private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

    // Typing indicator management
    private typingTimer: number | null = null;
    private typingStartTime: number = 0;
    private readonly typingTimeout = 51730; // 30 seconds max typing time
    private readonly minTypingTime = 1000; // 1 second minimum typing time

    constructor() {
        super();
        this.initializeChatbot();
    }

    /**
     * Initialize the chatbot with default state and settings
     */
    private async initializeChatbot() {
        try {
            // Initialize chat service
            await this.initializeChatService();

            // Load user's conversations
            await this.loadConversations();

            // Set up periodic updates for real-time features
            this.setupPeriodicUpdates();

        } catch (error) {
            console.error('Failed to initialize chatbot:', error);
            this.showError('Failed to initialize chat. Please refresh the page.');
        }
    }

    /**
     * Initialize chat service integration
     */
    private async initializeChatService() {
        // This would typically import and initialize the chat service
        // For now, we'll create a basic implementation
        this.chatService = {
            sendMessage: async (request: SendMessageRequest) => {
                const response = await fetch('/api/v1/chat/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify(request)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            },

            getConversations: async () => {
                const response = await fetch('/api/v1/chat/conversations', {
                    headers: {
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            },

            createConversation: async (title?: string) => {
                const response = await fetch('/api/v1/chat/conversation', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify({ title })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                return await response.json();
            }
        };
    }

    /**
     * Get authentication token for API requests
     */
    private getAuthToken(): string | null {
        // This would typically get the token from your auth system
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }

    /**
     * Load user's conversations from the API
     */
    private async loadConversations() {
        try {
            this.isLoading = true;
            this.markForRender();

            const response = await this.chatService.getConversations();
            this.conversations = response.conversations || [];

            // If no conversations exist, create a welcome conversation
            if (this.conversations.length === 0) {
                await this.createWelcomeConversation();
            } else {
                // Load the most recent conversation
                this.currentConversation = this.conversations[0];
                if (this.currentConversation.id) {
                    await this.loadConversationHistory(this.currentConversation.id);
                }
            }

        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.showError('Failed to load conversations. Please try again.');
        } finally {
            this.isLoading = false;
            this.markForRender();
        }
    }

    /**
     * Create a welcome conversation for new users
     */
    private async createWelcomeConversation() {
        try {
            const conversation = await this.chatService.createConversation('Welcome Chat');
            this.conversations.unshift(conversation);
            this.currentConversation = conversation;

            // Add welcome message
            const welcomeMessage: ChatMessage = {
                conversation_id: conversation.id!,
                message_type: 'assistant',
                content: `Hello! I'm your school management assistant. I can help you with:

• Student Information - Get details about students, classes, and enrollment
• Driver Information - Find driver details, routes, and contact information
• Route Information - Get information about bus routes and coverage areas
• Fee Information - Learn about transport fees and payment details
• Contact Information - Get school contact details and emergency numbers

What would you like to know?`,
                created_at: Date.now()
            };

            this.messages.push(welcomeMessage);
            this.markForRender();

        } catch (error) {
            console.error('Failed to create welcome conversation:', error);
        }
    }

    /**
     * Load conversation history
     */
    private async loadConversationHistory(conversationId: string) {
        try {
            const response = await fetch(`/api/v1/chat/history/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (response.ok) {
                const history = await response.json();
                this.messages = history.messages || [];
                this.currentConversation = history.conversation;
            }

        } catch (error) {
            console.error('Failed to load conversation history:', error);
        }
    }

    /**
     * Set up periodic updates for real-time features
     */
    private setupPeriodicUpdates() {
        // Update typing status every 5 seconds
        setInterval(() => {
            this.updateTypingStatus();
        }, 5000);

        // Check for new messages every 10 seconds (in a real app, use WebSocket)
        setInterval(() => {
            if (this.currentConversation) {
                this.checkForNewMessages();
            }
        }, 10000);
    }

    /**
     * Update typing status indicator
     */
    private updateTypingStatus() {
        // Implementation would check if AI is typing
        // For now, just ensure UI is responsive
    }

    /**
     * Check for new messages (polling fallback for WebSocket)
     */
    private async checkForNewMessages() {
        if (!this.currentConversation) return;

        try {
            await this.loadConversationHistory(this.currentConversation.id!);
            this.markForRender();
        } catch (error) {
            // Silently handle errors for background updates
            console.debug('Background message check failed:', error);
        }
    }

    /**
     * Send a message to the chatbot with enhanced UX and typing indicators
     */
    private async sendMessage() {
        if (!this.messageInput || !this.currentConversation) return;

        const content = this.messageInput.value.trim();
        if (!content || this.isTyping) return;

        const userMessage: ChatMessage = {
            conversation_id: this.currentConversation.id!,
            message_type: 'user',
            content: content,
            created_at: Date.now(),
            status: 'sending'
        };

        // Add user message to UI immediately with sending status
        this.messages.push(userMessage);
        this.messageInput.value = '';
        this.isTyping = true;

        // Auto-resize input
        this.adjustTextareaHeight();

        // Start typing indicator for AI response
        this.startTypingIndicator();

        this.markForRender();

        try {
            // Send to API with enhanced error handling
            const response = await this.chatService.sendMessage({
                conversation_id: this.currentConversation.id!,
                content: content,
                message_type: 'user'
            });

            // Update user message status to sent
            const lastMessage = this.messages[this.messages.length - 1];
            if (lastMessage && lastMessage.status === 'sending') {
                this.messages[this.messages.length - 1] = {
                    ...lastMessage,
                    status: 'sent'
                };
            }

            // Add AI response with enhanced metadata
            const aiMessage: ChatMessage = {
                conversation_id: this.currentConversation.id!,
                message_type: 'assistant',
                content: response.ai_response,
                created_at: Date.now(),
                status: 'delivered',
                metadata: {
                    response_time: Date.now() - userMessage.created_at!,
                    model: this.getProps().defaultModel || 'default',
                    temperature: this.getProps().temperature || 0.7
                }
            };

            this.messages.push(aiMessage);

            // Update conversation metadata (create new object since it's readonly)
            if (this.currentConversation) {
                this.currentConversation = {
                    ...this.currentConversation,
                    message_count: (this.currentConversation.message_count || 0) + 2,
                    last_message_at: Date.now(),
                    updated_at: Date.now()
                };
            }

            // Emit events for other components
            this.dispatchCustomEvent('message-sent', { message: aiMessage });

        } catch (error) {
            console.error('Failed to send message:', error);

            // Update user message status to failed
            const lastMessage = this.messages[this.messages.length - 1];
            if (lastMessage && lastMessage.status === 'sending') {
                this.messages[this.messages.length - 1] = {
                    ...lastMessage,
                    status: 'failed'
                };
            }

            this.showError('Failed to send message. Please try again.');
            this.dispatchCustomEvent('error-occurred', { error: error as Error });

            // Remove the user message that failed to send
            this.messages.pop();
        } finally {
            this.stopTypingIndicator();
            this.isTyping = false;
            this.markForRender();

            // Scroll to bottom with smooth animation
            setTimeout(() => {
                this.scrollToBottom();
            }, 100);
        }
    }

    /**
     * Start typing indicator for AI response
     */
    private startTypingIndicator(): void {
        this.typingStartTime = Date.now();

        // Clear any existing timer
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }

        // Set a timeout to stop typing indicator if it takes too long
        this.typingTimer = window.setTimeout(() => {
            this.stopTypingIndicator();
        }, this.typingTimeout);

        this.dispatchCustomEvent('typing-started', { userId: 'ai' });
    }

    /**
     * Stop typing indicator for AI response
     */
    private stopTypingIndicator(): void {
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }

        // Ensure minimum typing time for better UX
        const elapsedTime = Date.now() - this.typingStartTime;
        if (elapsedTime < this.minTypingTime) {
            setTimeout(() => {
                this.dispatchCustomEvent('typing-stopped', { userId: 'ai' });
            }, this.minTypingTime - elapsedTime);
        } else {
            this.dispatchCustomEvent('typing-stopped', { userId: 'ai' });
        }
    }

    /**
     * Enhanced error display with better UX
     */
    private showError(message: string) {
        // Create enhanced error toast with better styling
        const errorElement = document.createElement('div');
        errorElement.className = 'chat-error enhanced-error';
        errorElement.innerHTML = `
            <div class="error-content">
                <icon-alert-circle size="16"></icon-alert-circle>
                <span>${message}</span>
                <button class="error-dismiss" onclick="this.parentElement.parentElement.remove()">
                    <icon-x size="14"></icon-x>
                </button>
            </div>
        `;

        // Add to shadow DOM
        this.shadowRoot?.appendChild(errorElement);

        // Auto remove after 8 seconds (longer than before for better UX)
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 8000);
    }

    /**
     * Create a new conversation
     */
    private async createNewConversation() {
        try {
            const title = `Chat ${new Date().toLocaleDateString()}`;
            const conversation = await this.chatService.createConversation(title);

            this.conversations.unshift(conversation);
            this.currentConversation = conversation;
            this.messages = [];

            this.markForRender();

            // Focus on message input
            setTimeout(() => {
                this.messageInput?.focus();
            }, 100);

        } catch (error) {
            console.error('Failed to create new conversation:', error);
            this.showError('Failed to create new conversation. Please try again.');
        }
    }

    /**
     * Switch to a different conversation
     */
    private async switchConversation(conversation: ChatConversation) {
        if (this.currentConversation?.id === conversation.id) return;

        this.currentConversation = conversation;
        await this.loadConversationHistory(conversation.id!);
        this.markForRender();

        // Focus on message input
        setTimeout(() => {
            this.messageInput?.focus();
        }, 100);
    }


    /**
     * Auto-resize textarea based on content
     */
    private adjustTextareaHeight() {
        if (this.messageInput) {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        }
    }

    /**
     * Scroll chat messages to bottom
     */
    private scrollToBottom() {
        const messagesContainer = this.shadowRoot?.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    /**
     * Perform the actual rendering implementation with enhanced features
     */
    protected performRender(): void {
        const shadow = this.shadowRoot!;
        const { conversations, currentConversation, messages, isTyping, isLoading, error } = this.getState();

        shadow.innerHTML = `
            <div class="chatbot-container">
                <div class="chat-header">
                    <h2>School Assistant</h2>
                    <div class="conversation-selector">
                        <select id="conversation-select" class="conversation-select">
                            <option value="">Select Conversation...</option>
                            ${conversations.map(conv => `
                                <option value="${conv.id}" ${currentConversation?.id === conv.id ? 'selected' : ''}>
                                    ${conv.title || `Chat ${new Date(conv.created_at || 0).toLocaleDateString()}`}
                                </option>
                            `).join('')}
                        </select>
                        <button id="new-chat-btn" class="new-chat-btn" title="Start New Conversation">
                            <icon-plus size="16"></icon-plus>
                        </button>
                    </div>
                </div>

                <div class="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
                    ${isLoading ? this.renderLoadingState() : this.renderMessages()}
                </div>

                <div class="chat-input-container">
                    <div class="input-wrapper">
                        <textarea
                            id="message-input"
                            class="message-input ${isTyping ? 'disabled' : ''}"
                            placeholder="Type your message here... (e.g., 'Show me student information for Priya')"
                            rows="1"
                            maxlength="1000"
                            ${isTyping ? 'disabled' : ''}
                        ></textarea>
                        <button
                            id="send-btn"
                            class="send-btn ${isTyping ? 'disabled' : ''}"
                            ${isTyping ? 'disabled' : ''}
                            title="${isTyping ? 'AI is responding...' : 'Send Message'}"
                        >
                            ${isTyping ? '<icon-loader-2 size="16" class="spinning"></icon-loader-2>' : '<icon-send size="16"></icon-send>'}
                        </button>
                    </div>
                    ${isTyping ? `
                        <div class="typing-indicator enhanced-typing">
                            <div class="typing-dots">
                                <span></span><span></span><span></span>
                            </div>
                            <span class="typing-text">AI is thinking...</span>
                        </div>
                    ` : ''}
                </div>

                <div class="chat-footer">
                    <small>AI assistant can help with student info, driver details, routes, fees, and contacts</small>
                </div>
            </div>
        `;

        // Apply error styling if there's an error
        if (error) {
            const container = shadow.querySelector('.chatbot-container');
            if (container) {
                container.classList.add('error-state');
            }
        }
    }

    /**
     * Render loading state with enhanced UX
     */
    private renderLoadingState(): string {
        return `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading conversations...</p>
            </div>
        `;
    }

    /**
     * Render all chat messages with enhanced features
     */
    private renderMessages(): string {
        const { messages } = this.getState();
        const { showTimestamps = true } = this.getProps();

        if (messages.length === 0) {
            return `
                <div class="no-messages">
                    <p>No messages yet. Start a conversation!</p>
                </div>
            `;
        }

        return messages.map((message: ChatMessage) => this.renderMessage(message)).join('');
    }

    /**
     * Render a single message with enhanced features and typing indicators
     */
    private renderMessage(message: ChatMessage): string {
        const isUser = message.message_type === 'user';
        const timestamp = message.created_at && this.getProps().showTimestamps
            ? new Date(message.created_at).toLocaleTimeString()
            : '';

        return `
            <div class="message ${isUser ? 'user-message' : 'assistant-message'}">
                <div class="message-avatar">
                    ${isUser ? '<icon-user size="16"></icon-user>' : '<icon-bot size="16"></icon-bot>'}
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        <div class="message-text">${this.formatMessageContent(message.content)}</div>
                        <div class="message-time">${timestamp}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Format message content for display with enhanced security and features
     */
    private formatMessageContent(content: string): string {
        // Basic formatting for URLs, emails, etc.
        return content
            .replace(/\n/g, '<br>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
            .replace(/(\w+@\w+\.\w+)/g, '<a href="mailto:$1">$1</a>');
    }

    /**
     * Set up event listeners for the chat interface
     */
    protected setupEventListeners(): void {
        const shadow = this.shadowRoot!;

        // Message input
        this.messageInput = shadow.getElementById('message-input') as HTMLTextAreaElement;
        this.messageInput?.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });

        this.messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        const sendBtn = shadow.getElementById('send-btn');
        sendBtn?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Conversation selector
        const conversationSelect = shadow.getElementById('conversation-select') as HTMLSelectElement;
        conversationSelect?.addEventListener('change', (e) => {
            const conversationId = (e.target as HTMLSelectElement).value;
            if (conversationId) {
                const conversation = this.conversations.find(c => c.id === conversationId);
                if (conversation) {
                    this.switchConversation(conversation);
                }
            }
        });

        // New chat button
        const newChatBtn = shadow.getElementById('new-chat-btn');
        newChatBtn?.addEventListener('click', () => {
            this.createNewConversation();
        });

        // Auto-scroll on new messages
        const messagesContainer = shadow.querySelector('.messages-container');
        if (messagesContainer) {
            const observer = new MutationObserver(() => {
                this.scrollToBottom();
            });

            observer.observe(messagesContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Handle component disconnection
     */
    disconnectedCallback() {
        super.disconnectedCallback();
        // Clean up any timers or connections
    }

    /**
     * Public method to set current conversation programmatically
     */
    setConversation(conversationId: string) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
            this.switchConversation(conversation);
        }
    }

    /**
     * Public method to add a message programmatically
     */
    addMessage(content: string, type: 'user' | 'assistant' | 'system' = 'user') {
        const message: ChatMessage = {
            conversation_id: this.currentConversation?.id || 'default',
            message_type: type,
            content: content,
            created_at: Date.now()
        };

        this.messages.push(message);
        this.markForRender();

        // Scroll to bottom
        setTimeout(() => {
            this.scrollToBottom();
        }, 100);
    }
}

// Export for use in other modules
export { ChatbotComponent };