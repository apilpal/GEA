// Chat Service - Frontend service for chat API integration
import { apiService } from './api-service';

/**
 * Enhanced types for chat functionality with caching support
 */
export type MessageType = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'archived' | 'deleted';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Cache entry interface for performance optimization
 */
interface CacheEntry<T> {
    readonly data: T;
    readonly timestamp: number;
    readonly ttl: number;
    readonly key: string;
}

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
    readonly cacheHitRate: number;
    readonly averageResponseTime: number;
    readonly totalRequests: number;
    readonly cacheSize: number;
}

/**
 * Conversation context interface for memory management
 */
interface ConversationContext {
    readonly conversationId: string;
    readonly topics: Set<string>;
    readonly entities: Map<string, any>;
    readonly userPreferences: Map<string, any>;
    readonly messageCount: number;
    readonly lastActivity: number;
    readonly importance: number;
    readonly summary?: string;
}

/**
 * Memory entry interface for long-term storage
 */
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

/**
 * Interface for chat message in frontend
 */
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

/**
 * Interface for chat conversation
 */
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

/**
 * Request/Response interfaces for API communication
 */
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

/**
 * Chat service class for handling all chat-related API communications.
 * Provides methods for conversation management, message handling, and real-time updates.
 */
/**
 * Enhanced chat service with caching, performance optimization, and memory management
 */
export class ChatService {
    private static instance: ChatService;
    private baseUrl: string = '/api/v1/chat';
    private authToken: string | null = null;
    private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

    // Caching system
    private cache: Map<string, CacheEntry<any>> = new Map();
    private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes
    private readonly maxCacheSize = 1000;
    private cacheHitCount = 0;
    private totalRequestCount = 0;

    // Performance monitoring
    private requestTimes: number[] = [];
    private readonly maxRequestTimeSamples = 100;

    // Conversation context and memory
    private conversationContexts: Map<string, ConversationContext> = new Map();
    private messageHistory: Map<string, ChatMessage[]> = new Map();
    private longTermMemory: Map<string, MemoryEntry> = new Map();
    private readonly memoryDecayInterval = 24 * 60 * 60 * 1000; // 24 hours

    private constructor() {
        this.initializeAuth();
        this.setupAuthHeaders();
        this.startPeriodicCleanup();
    }

    /**
     * Get singleton instance of chat service
     */
    public static getInstance(): ChatService {
        if (!ChatService.instance) {
            ChatService.instance = new ChatService();
        }
        return ChatService.instance;
    }

    /**
     * Initialize authentication token
     */
    private initializeAuth() {
        this.authToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    }

    /**
     * Set authentication token
     */
    public setAuthToken(token: string) {
        this.authToken = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
        }
    }

    /**
     * Setup authentication headers for requests
     */
    private setupAuthHeaders() {
        // This will be handled in each request method
    }

    /**
     * Handle unauthorized access
     */
    private handleUnauthorized() {
        this.setAuthToken('');
        this.emit('auth:unauthorized', {});
    }

    /**
     * Event emitter for real-time updates
     */
    public on(event: string, callback: (data: any) => void): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.eventListeners.get(event)?.delete(callback);
        };
    }

    /**
     * Emit event to listeners
     */
    private emit(event: string, data: any) {
        this.eventListeners.get(event)?.forEach(callback => callback(data));
    }

    /**
     * Create a new conversation
     */
    public async createConversation(request?: CreateConversationRequest): Promise<ChatConversation> {
        try {
            const response = await apiService.post(`${this.baseUrl}/conversation`, request || {});
            this.emit('conversation:created', response.data);
            return response.data as ChatConversation;
        } catch (error) {
            console.error('Failed to create conversation:', error);
            throw new Error('Failed to create conversation');
        }
    }

    /**
     * Get user's conversations
     */
    public async getConversations(params?: { skip?: number; limit?: number }): Promise<ConversationResponse> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.skip) queryParams.append('skip', params.skip.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());

            const queryString = queryParams.toString();
            const url = `${this.baseUrl}/conversations${queryString ? `?${queryString}` : ''}`;

            const response = await apiService.get(url);
            return response.data as unknown as ConversationResponse;
        } catch (error) {
            console.error('Failed to get conversations:', error);
            throw new Error('Failed to load conversations');
        }
    }

    /**
     * Send a message in a conversation with enhanced caching and performance optimization
     */
    public async sendMessage(request: SendMessageRequest): Promise<{ user_message: ChatMessage; ai_response: string }> {
        const startTime = performance.now();
        this.totalRequestCount++;

        // Check cache first for similar messages
        const cacheKey = this.generateMessageCacheKey(request.conversation_id, request.content, request.message_type);
        const cachedResponse = this.getCache<{ user_message: ChatMessage; ai_response: string }>(cacheKey);

        if (cachedResponse && request.message_type === 'user') {
            this.cacheHitCount++;
            console.log('Cache hit for message:', cacheKey);

            // Still emit events for UI updates even with cached response
            this.emit('message:sent', {
                conversation_id: request.conversation_id,
                user_message: cachedResponse.user_message,
                ai_response: cachedResponse.ai_response
            });

            return cachedResponse;
        }

        try {
            const response = await apiService.post(`${this.baseUrl}/message`, request);

            // Emit events for real-time updates
            this.emit('message:sent', {
                conversation_id: request.conversation_id,
                user_message: (response.data as any).user_message,
                ai_response: (response.data as any).ai_response
            });

            // Cache the response for future use (only for user messages)
            if (request.message_type === 'user') {
                this.setCache(cacheKey, response.data, this.defaultCacheTTL);
            }

            // Update conversation context for better AI responses
            this.updateConversationContext(request.conversation_id, response.data);

            const endTime = performance.now();
            this.recordRequestTime(endTime - startTime);

            return response.data as unknown as { user_message: ChatMessage; ai_response: string };
        } catch (error) {
            console.error('Failed to send message:', error);
            throw new Error('Failed to send message');
        }
    }

    /**
     * Get conversation history
     */
    public async getConversationHistory(
        conversationId: string,
        params?: { limit?: number; offset?: number }
    ): Promise<ChatHistoryResponse> {
        try {
            const queryParams = new URLSearchParams();
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());

            const queryString = queryParams.toString();
            const url = `${this.baseUrl}/history/${conversationId}${queryString ? `?${queryString}` : ''}`;

            const response = await apiService.get(url);
            return response.data as unknown as ChatHistoryResponse;
        } catch (error) {
            console.error('Failed to get conversation history:', error);
            throw new Error('Failed to load conversation history');
        }
    }

    /**
     * Update conversation metadata
     */
    public async updateConversation(
        conversationId: string,
        updates: Partial<ChatConversation>
    ): Promise<ChatConversation> {
        try {
            const response = await apiService.put(`${this.baseUrl}/conversation/${conversationId}`, updates);
            this.emit('conversation:updated', response.data);
            return response.data as unknown as ChatConversation;
        } catch (error) {
            console.error('Failed to update conversation:', error);
            throw new Error('Failed to update conversation');
        }
    }

    /**
     * Archive/delete a conversation
     */
    public async deleteConversation(conversationId: string): Promise<{ message: string }> {
        try {
            const response = await apiService.delete(`${this.baseUrl}/conversation/${conversationId}`);
            this.emit('conversation:deleted', { conversation_id: conversationId });
            return response.data as unknown as { message: string };
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            throw new Error('Failed to delete conversation');
        }
    }

    /**
     * Get conversation context
     */
    public async getConversationContext(conversationId: string): Promise<Record<string, any>> {
        try {
            const response = await apiService.get(`${this.baseUrl}/context/${conversationId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to get conversation context:', error);
            throw new Error('Failed to load conversation context');
        }
    }

    /**
     * Upload file attachment
     */
    public async uploadAttachment(file: File): Promise<{ url: string; filename: string }> {
        try {
            // For now, return a placeholder response since file upload isn't implemented in the API service
            return {
                url: URL.createObjectURL(file),
                filename: file.name
            };
        } catch (error) {
            console.error('Failed to upload attachment:', error);
            throw new Error('Failed to upload file');
        }
    }

    /**
     * Search conversations
     */
    public async searchConversations(query: string): Promise<ConversationResponse> {
        try {
            const response = await apiService.get(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
            return response.data as unknown as ConversationResponse;
        } catch (error) {
            console.error('Failed to search conversations:', error);
            throw new Error('Search failed');
        }
    }

    /**
     * Get chat statistics
     */
    public async getChatStats(): Promise<{
        total_conversations: number;
        total_messages: number;
        active_conversations: number;
    }> {
        try {
            const response = await apiService.get(`${this.baseUrl}/stats`);
            return response.data as unknown as {
                total_conversations: number;
                total_messages: number;
                active_conversations: number;
            };
        } catch (error) {
            console.error('Failed to get chat stats:', error);
            throw new Error('Failed to load statistics');
        }
    }

    /**
     * Mark messages as read
     */
    public async markAsRead(conversationId: string, messageIds: string[]): Promise<void> {
        try {
            await apiService.post(`${this.baseUrl}/read`, {
                conversation_id: conversationId,
                message_ids: messageIds
            });

            this.emit('messages:read', { conversation_id: conversationId, message_ids: messageIds });
        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
    }

    /**
     * Real-time message polling (fallback for WebSocket)
     */
    public startPolling(conversationId: string, interval: number = 10000): () => void {
        const poll = async () => {
            try {
                const history = await this.getConversationHistory(conversationId);
                this.emit('messages:updated', {
                    conversation_id: conversationId,
                    messages: history.messages
                });
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Initial poll
        poll();

        // Set up interval
        const intervalId = setInterval(poll, interval);

        // Return cleanup function
        return () => clearInterval(intervalId);
    }

    /**
     * WebSocket connection for real-time updates (if available)
     */
    public connectWebSocket(): WebSocket | null {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}${this.baseUrl}/ws`;

            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log('Chat WebSocket connected');
                this.emit('websocket:connected', {});
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.emit('websocket:message', data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            socket.onclose = () => {
                console.log('Chat WebSocket disconnected');
                this.emit('websocket:disconnected', {});
            };

            socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('websocket:error', error);
            };

            return socket;
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            return null;
        }
    }

    /**
     * Enhanced caching system for performance optimization
     */
    private setCache<T>(key: string, data: T, ttl: number = this.defaultCacheTTL): void {
        // Clean up old entries if cache is getting too large
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldestCacheEntries();
        }

        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            key
        };

        this.cache.set(key, entry);
    }

    /**
     * Get cached data if it exists and hasn't expired
     */
    private getCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Evict oldest cache entries when cache size limit is reached
     */
    private evictOldestCacheEntries(): void {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = Math.floor(this.maxCacheSize * 0.2); // Remove 20% of oldest entries
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
        }
    }

    /**
     * Generate cache key for messages
     */
    private generateMessageCacheKey(conversationId: string, content: string, messageType: MessageType): string {
        const hash = this.simpleHash(content + messageType);
        return `msg:${conversationId}:${hash}`;
    }

    /**
     * Generate cache key for conversations
     */
    private generateConversationCacheKey(userId?: number): string {
        return `conv:${userId || 'guest'}`;
    }

    /**
     * Simple hash function for cache keys
     */
    private simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Start periodic cleanup of expired cache entries
     */
    private startPeriodicCleanup(): void {
        setInterval(() => {
            this.cleanupExpiredCache();
        }, this.defaultCacheTTL);
    }

    /**
     * Clean up expired cache entries
     */
    private cleanupExpiredCache(): void {
        const now = Date.now();
        Array.from(this.cache.entries()).forEach(([key, entry]) => {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        });
    }

    /**
     * Get performance metrics for monitoring
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        const cacheHitRate = this.totalRequestCount > 0
            ? this.cacheHitCount / this.totalRequestCount
            : 0;

        const averageResponseTime = this.requestTimes.length > 0
            ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
            : 0;

        return {
            cacheHitRate,
            averageResponseTime,
            totalRequests: this.totalRequestCount,
            cacheSize: this.cache.size
        };
    }

    /**
     * Record request performance metrics
     */
    private recordRequestTime(duration: number): void {
        this.requestTimes.push(duration);
        if (this.requestTimes.length > this.maxRequestTimeSamples) {
            this.requestTimes.shift(); // Remove oldest entry
        }
    }


    /**
     * Update conversation context for better AI responses
     */
    private updateConversationContext(conversationId: string, responseData: any): void {
        const existingContext = this.conversationContexts.get(conversationId);

        if (!existingContext) {
            const newContext: ConversationContext = {
                conversationId,
                topics: new Set<string>(),
                entities: new Map<string, any>(),
                userPreferences: new Map<string, any>(),
                messageCount: 1,
                lastActivity: Date.now(),
                importance: this.calculateImportance(responseData)
            };

            // Extract topics from messages for context awareness
            if (responseData.ai_response) {
                const topics = this.extractTopics(responseData.ai_response);
                topics.forEach(topic => newContext.topics.add(topic));
            }

            this.conversationContexts.set(conversationId, newContext);
        } else {
            // Create updated context (since properties are readonly)
            const updatedContext: ConversationContext = {
                conversationId: existingContext.conversationId,
                topics: new Set(Array.from(existingContext.topics)),
                entities: new Map(existingContext.entities),
                userPreferences: new Map(existingContext.userPreferences),
                messageCount: existingContext.messageCount + 1,
                lastActivity: Date.now(),
                importance: Math.max(existingContext.importance, this.calculateImportance(responseData))
            };

            // Extract topics from messages for context awareness
            if (responseData.ai_response) {
                const topics = this.extractTopics(responseData.ai_response);
                topics.forEach(topic => updatedContext.topics.add(topic));
            }

            this.conversationContexts.set(conversationId, updatedContext);
        }
    }

    /**
     * Calculate importance score for conversation context
     */
    private calculateImportance(responseData: any): number {
        let importance = 0.5; // Base importance

        // Increase importance based on response characteristics
        if (responseData.ai_response) {
            const responseLength = responseData.ai_response.length;
            if (responseLength > 500) importance += 0.2;
            if (responseLength > 1000) importance += 0.1;
        }

        // Increase importance for certain topics
        if (responseData.ai_response) {
            const topics = this.extractTopics(responseData.ai_response);
            if (topics.includes('student') || topics.includes('driver')) importance += 0.1;
        }

        return Math.min(importance, 1.0); // Cap at 1.0
    }

    /**
     * Extract topics from message content for context awareness
     */
    private extractTopics(content: string): string[] {
        // Simple topic extraction - can be enhanced with NLP
        const topics = new Set<string>();
        const lowerContent = content.toLowerCase();

        if (lowerContent.includes('student')) topics.add('student');
        if (lowerContent.includes('driver')) topics.add('driver');
        if (lowerContent.includes('route') || lowerContent.includes('bus')) topics.add('transport');
        if (lowerContent.includes('fee') || lowerContent.includes('payment')) topics.add('fee');
        if (lowerContent.includes('contact') || lowerContent.includes('phone')) topics.add('contact');

        return Array.from(topics);
    }


    /**
     * Preload conversation history for better UX
     */
    public async preloadConversationHistory(conversationId: string): Promise<void> {
        try {
            const history = await this.getConversationHistory(conversationId);
            this.messageHistory.set(conversationId, history.messages);
        } catch (error) {
            console.warn('Failed to preload conversation history:', error);
        }
    }

    /**
     * Get cached message history
     */
    public getCachedMessageHistory(conversationId: string): ChatMessage[] | null {
        return this.messageHistory.get(conversationId) || null;
    }

    /**
     * Clear cache for specific conversation
     */
    public clearConversationCache(conversationId: string): void {
        // Remove conversation-specific cache entries
        Array.from(this.cache.keys()).forEach(key => {
            if (key.startsWith(`msg:${conversationId}:`)) {
                this.cache.delete(key);
            }
        });

        // Clear conversation context and history
        this.conversationContexts.delete(conversationId);
        this.messageHistory.delete(conversationId);
    }

    /**
     * Clear all caches
     */
    public clearAllCaches(): void {
        this.cache.clear();
        this.conversationContexts.clear();
        this.messageHistory.clear();
        this.longTermMemory.clear();
        this.cacheHitCount = 0;
        this.totalRequestCount = 0;
        this.requestTimes = [];
    }

    /**
     * Add memory entry for long-term storage
     */
    public addMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): string {
        const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const memoryEntry: MemoryEntry = {
            id,
            timestamp: Date.now(),
            ...entry
        };

        this.longTermMemory.set(id, memoryEntry);
        return id;
    }

    /**
     * Retrieve relevant memories based on query
     */
    public getRelevantMemories(query: string, limit: number = 5): MemoryEntry[] {
        const queryLower = query.toLowerCase();
        const relevantMemories: Array<{ entry: MemoryEntry; score: number }> = [];

        Array.from(this.longTermMemory.values()).forEach(entry => {
            // Apply decay factor based on age
            const age = Date.now() - entry.timestamp;
            const decayFactor = Math.exp(-age / this.memoryDecayInterval);
            const effectiveImportance = entry.importance * decayFactor;

            // Simple relevance scoring
            let score = effectiveImportance;
            if (entry.content.toLowerCase().includes(queryLower)) {
                score += 0.5;
            }

            // Check metadata relevance
            for (const [key, value] of Object.entries(entry.metadata)) {
                if (key.toLowerCase().includes(queryLower) ||
                    String(value).toLowerCase().includes(queryLower)) {
                    score += 0.3;
                }
            }

            if (score > 0.2) { // Minimum relevance threshold
                relevantMemories.push({ entry, score });
            }
        }

        // Sort by score and return top entries
        return relevantMemories
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.entry);
    }

    /**
     * Update user preferences based on conversation
     */
    public updateUserPreferences(conversationId: string, preferences: Record<string, any>): void {
        const context = this.conversationContexts.get(conversationId);
        if (context) {
            const updatedPreferences = new Map(context.userPreferences);
            for (const [key, value] of Object.entries(preferences)) {
                updatedPreferences.set(key, value);
            }

            const updatedContext: ConversationContext = {
                ...context,
                userPreferences: updatedPreferences
            };

            this.conversationContexts.set(conversationId, updatedContext);
        }
    }

    /**
     * Get conversation insights for AI context
     */
    public getConversationInsights(conversationId: string): {
        topics: string[];
        entities: Record<string, any>;
        preferences: Record<string, any>;
        memory: MemoryEntry[];
        importance: number;
    } {
        const context = this.conversationContexts.get(conversationId);
        if (!context) {
            return {
                topics: [],
                entities: {},
                preferences: {},
                memory: [],
                importance: 0
            };
        }

        // Get relevant memories based on conversation topics
        const allTopics = Array.from(context.topics);
        const query = allTopics.join(' ');
        const relevantMemory = this.getRelevantMemories(query, 3);

        return {
            topics: allTopics,
            entities: Object.fromEntries(context.entities),
            preferences: Object.fromEntries(context.userPreferences),
            memory: relevantMemory,
            importance: context.importance
        };
    }

    /**
     * Clean up old memories based on decay
     */
    private cleanupOldMemories(): void {
        const now = Date.now();
        const cutoffTime = now - (7 * this.memoryDecayInterval); // Keep 7 days

        Array.from(this.longTermMemory.entries()).forEach(([id, entry]) => {
            const age = now - entry.timestamp;
            const decayedImportance = entry.importance * Math.exp(-age / this.memoryDecayInterval);

            if (decayedImportance < 0.1 || entry.timestamp < cutoffTime) {
                this.longTermMemory.delete(id);
            }
        });
    }

    /**
     * Start memory decay and cleanup processes
     */
    private startMemoryManagement(): void {
        // Clean up old memories every hour
        setInterval(() => {
            this.cleanupOldMemories();
        }, 60 * 60 * 1000);
    }
}

// Export singleton instance
export const chatService = ChatService.getInstance();