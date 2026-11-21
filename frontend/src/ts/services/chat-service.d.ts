export type MessageType = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';
interface PerformanceMetrics {
    readonly cacheHitRate: number;
    readonly averageResponseTime: number;
    readonly totalRequests: number;
    readonly cacheSize: number;
}
interface MemoryEntry {
    readonly id: string;
    readonly type: 'fact' | 'preference' | 'relationship' | 'event';
    readonly content: string;
    readonly importance: number;
    readonly confidence: number;
    readonly timestamp: number;
    readonly metadata: Record<string, any>;
    readonly decayFactor: number;
}
export interface ChatMessage {
    id?: string;
    conversation_id: string;
    message_type: MessageType;
    content: string;
    metadata?: Record<string, any>;
    created_at?: number;
    updated_at?: number;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}
export interface ChatConversation {
    id?: string;
    user_id?: number;
    title?: string;
    status: ConversationStatus;
    priority: ConversationPriority;
    context_data?: Record<string, any>;
    message_count?: number;
    last_message_at?: number;
    created_at?: number;
    updated_at?: number;
}
export interface CreateConversationRequest {
    title?: string;
    priority?: ConversationPriority;
    initial_context?: Record<string, any>;
}
export interface SendMessageRequest {
    conversation_id: string;
    content: string;
    message_type: MessageType;
    metadata?: Record<string, any>;
}
export interface ConversationResponse {
    conversations: ChatConversation[];
    total_count: number;
}
export interface ChatHistoryResponse {
    conversation: ChatConversation;
    messages: ChatMessage[];
    context?: Record<string, any>;
}
export declare class ChatService {
    private static instance;
    private baseUrl;
    private authToken;
    private eventListeners;
    private cache;
    private readonly defaultCacheTTL;
    private readonly maxCacheSize;
    private cacheHitCount;
    private totalRequestCount;
    private requestTimes;
    private readonly maxRequestTimeSamples;
    private conversationContexts;
    private messageHistory;
    private longTermMemory;
    private readonly memoryDecayInterval;
    private constructor();
    static getInstance(): ChatService;
    private initializeAuth;
    setAuthToken(token: string): void;
    private setupAuthHeaders;
    private handleUnauthorized;
    on(event: string, callback: (data: any) => void): () => void;
    private emit;
    createConversation(request?: CreateConversationRequest): Promise<ChatConversation>;
    getConversations(params?: {
        skip?: number;
        limit?: number;
    }): Promise<ConversationResponse>;
    sendMessage(request: SendMessageRequest): Promise<{
        user_message: ChatMessage;
        ai_response: string;
    }>;
    getConversationHistory(conversationId: string, params?: {
        limit?: number;
        offset?: number;
    }): Promise<ChatHistoryResponse>;
    updateConversation(conversationId: string, updates: Partial<ChatConversation>): Promise<ChatConversation>;
    deleteConversation(conversationId: string): Promise<{
        message: string;
    }>;
    getConversationContext(conversationId: string): Promise<Record<string, any>>;
    uploadAttachment(file: File): Promise<{
        url: string;
        filename: string;
    }>;
    searchConversations(query: string): Promise<ConversationResponse>;
    getChatStats(): Promise<{
        total_conversations: number;
        total_messages: number;
        active_conversations: number;
    }>;
    markAsRead(conversationId: string, messageIds: string[]): Promise<void>;
    startPolling(conversationId: string, interval?: number): () => void;
    connectWebSocket(): WebSocket | null;
    private setCache;
    private getCache;
    private evictOldestCacheEntries;
    private generateMessageCacheKey;
    private generateConversationCacheKey;
    private simpleHash;
    private startPeriodicCleanup;
    private cleanupExpiredCache;
    getPerformanceMetrics(): PerformanceMetrics;
    private recordRequestTime;
    private updateConversationContext;
    private calculateImportance;
    private extractTopics;
    preloadConversationHistory(conversationId: string): Promise<void>;
    getCachedMessageHistory(conversationId: string): ChatMessage[] | null;
    clearConversationCache(conversationId: string): void;
    clearAllCaches(): void;
    addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): string;
    getRelevantMemories(query: string, limit?: number): MemoryEntry[];
    updateUserPreferences(conversationId: string, preferences: Record<string, any>): void;
    getConversationInsights(conversationId: string): {
        topics: string[];
        entities: Record<string, any>;
        preferences: Record<string, any>;
        memory: MemoryEntry[];
        importance: number;
    };
    private cleanupOldMemories;
    private startMemoryManagement;
}
export declare const chatService: ChatService;
export {};
//# sourceMappingURL=chat-service.d.ts.map