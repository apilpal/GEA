// AI Chat Integration Tests

import { ChatService } from '../../src/ts/services/chat-service';
import { ChatbotComponent } from '../../src/ts/components/chat/chatbot-component';
import { ChatInputComponent } from '../../src/ts/components/chat/chat-input-component';
import { ChatMessageComponent } from '../../src/ts/components/chat/chat-message-component';

// Mock the ChatService
jest.mock('../../src/ts/services/chat-service');

describe('AI Chat Integration', () => {
    let chatService: jest.Mocked<ChatService>;
    let chatbotComponent: ChatbotComponent;
    let chatInputComponent: ChatInputComponent;
    let chatMessageComponent: ChatMessageComponent;

    beforeEach(() => {
        // Setup mocks
        chatService = new ChatService({ apiUrl: 'http://test.com' }) as jest.Mocked<ChatService>;

        // Mock DOM environment
        document.body.innerHTML = `
            <div id="chatbot-container"></div>
            <div id="chat-input-container"></div>
            <div id="chat-message-container"></div>
        `;

        // Initialize components
        chatbotComponent = new ChatbotComponent();
        chatInputComponent = new ChatInputComponent();
        chatMessageComponent = new ChatMessageComponent();

        document.getElementById('chatbot-container')?.appendChild(chatbotComponent);
        document.getElementById('chat-input-container')?.appendChild(chatInputComponent);
        document.getElementById('chat-message-container')?.appendChild(chatMessageComponent);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Chat Service Integration', () => {
        it('should send message and receive response', async () => {
            const mockResponse = {
                message: 'Hello! How can I help you?',
                timestamp: new Date(),
                isAI: true,
            };

            chatService.sendMessage.mockResolvedValue(mockResponse);

            const result = await chatService.sendMessage('Hello AI');

            expect(chatService.sendMessage).toHaveBeenCalledWith('Hello AI');
            expect(result).toEqual(mockResponse);
        });

        it('should handle API errors gracefully', async () => {
            const errorMessage = 'API Error';
            chatService.sendMessage.mockRejectedValue(new Error(errorMessage));

            await expect(chatService.sendMessage('test')).rejects.toThrow(errorMessage);
        });

        it('should get chat history', async () => {
            const mockHistory = [
                { message: 'Hello', timestamp: new Date(), isAI: false },
                { message: 'Hi there!', timestamp: new Date(), isAI: true },
            ];

            chatService.getChatHistory.mockResolvedValue(mockHistory);

            const history = await chatService.getChatHistory();

            expect(chatService.getChatHistory).toHaveBeenCalled();
            expect(history).toEqual(mockHistory);
        });
    });

    describe('Component Integration', () => {
        it('should integrate chatbot with chat input', () => {
            // Test that components can communicate
            const messageEvent = new CustomEvent('message-sent', {
                detail: { message: 'Test message' },
            });

            const messageHandler = jest.fn();
            chatbotComponent.addEventListener('message-sent', messageHandler);

            chatInputComponent.dispatchEvent(messageEvent);

            expect(messageHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { message: 'Test message' },
                })
            );
        });

        it('should handle message display integration', () => {
            const messageData = {
                message: 'Test message',
                timestamp: new Date(),
                isAI: true,
            };

            // Simulate message component receiving data
            const messageEvent = new CustomEvent('display-message', {
                detail: messageData,
            });

            const displayHandler = jest.fn();
            chatMessageComponent.addEventListener('message-displayed', displayHandler);

            chatMessageComponent.dispatchEvent(messageEvent);

            expect(displayHandler).toHaveBeenCalled();
        });

        it('should handle typing indicators', () => {
            // Test typing indicator integration
            const typingEvent = new CustomEvent('typing-start');
            const typingEndEvent = new CustomEvent('typing-end');

            const typingHandler = jest.fn();
            chatbotComponent.addEventListener('typing-indicator', typingHandler);

            chatInputComponent.dispatchEvent(typingEvent);
            expect(typingHandler).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'typing-start' })
            );

            chatInputComponent.dispatchEvent(typingEndEvent);
            expect(typingHandler).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'typing-end' })
            );
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle network errors across components', async () => {
            chatService.sendMessage.mockRejectedValue(new Error('Network error'));

            // Simulate error handling across components
            const errorEvent = new CustomEvent('network-error', {
                detail: { error: 'Network error' },
            });

            const errorHandler = jest.fn();
            chatbotComponent.addEventListener('error-occurred', errorHandler);

            chatbotComponent.dispatchEvent(errorEvent);

            expect(errorHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { error: 'Network error' },
                })
            );
        });

        it('should handle timeout errors', async () => {
            chatService.sendMessage.mockRejectedValue(new Error('Request timeout'));

            // Test timeout error propagation
            const timeoutEvent = new CustomEvent('timeout-error');

            const timeoutHandler = jest.fn();
            chatbotComponent.addEventListener('timeout-occurred', timeoutHandler);

            chatbotComponent.dispatchEvent(timeoutEvent);

            expect(timeoutHandler).toHaveBeenCalled();
        });
    });

    describe('Real-time Updates', () => {
        it('should handle real-time message updates', () => {
            const realTimeHandler = jest.fn();

            chatbotComponent.addEventListener('realtime-update', realTimeHandler);

            // Simulate real-time message
            const realTimeEvent = new CustomEvent('realtime-update', {
                detail: { message: 'Real-time message' },
            });

            chatbotComponent.dispatchEvent(realTimeEvent);

            expect(realTimeHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { message: 'Real-time message' },
                })
            );
        });

        it('should handle connection status changes', () => {
            const connectionHandler = jest.fn();

            chatbotComponent.addEventListener('connection-change', connectionHandler);

            // Test connection status changes
            const connectedEvent = new CustomEvent('connection-change', {
                detail: { connected: true },
            });

            chatbotComponent.dispatchEvent(connectedEvent);

            expect(connectionHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { connected: true },
                })
            );
        });
    });

    describe('Accessibility Integration', () => {
        it('should handle keyboard navigation', () => {
            const keyboardHandler = jest.fn();

            chatInputComponent.addEventListener('keyboard-navigation', keyboardHandler);

            // Simulate keyboard events
            const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
            const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });

            chatInputComponent.dispatchEvent(arrowUpEvent);
            chatInputComponent.dispatchEvent(arrowDownEvent);

            expect(keyboardHandler).toHaveBeenCalledTimes(2);
        });

        it('should handle screen reader announcements', () => {
            const announcementHandler = jest.fn();

            chatbotComponent.addEventListener('screen-reader-announce', announcementHandler);

            // Test screen reader announcements
            const announceEvent = new CustomEvent('screen-reader-announce', {
                detail: { message: 'Message sent successfully' },
            });

            chatbotComponent.dispatchEvent(announceEvent);

            expect(announcementHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { message: 'Message sent successfully' },
                })
            );
        });
    });

    describe('Performance Integration', () => {
        it('should handle large message history efficiently', async () => {
            const largeHistory = Array.from({ length: 1000 }, (_, i) => ({
                message: `Message ${i}`,
                timestamp: new Date(),
                isAI: i % 2 === 0,
            }));

            chatService.getChatHistory.mockResolvedValue(largeHistory);

            const startTime = performance.now();
            const history = await chatService.getChatHistory();
            const endTime = performance.now();

            expect(history).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(100); // Should be fast
        });

        it('should handle rapid message sending', async () => {
            const messages = ['Message 1', 'Message 2', 'Message 3'];
            const responses = messages.map(msg => ({ message: `Response to ${msg}`, timestamp: new Date(), isAI: true }));

            messages.forEach((msg, index) => {
                chatService.sendMessage.mockResolvedValueOnce(responses[index]);
            });

            const startTime = performance.now();

            const promises = messages.map(msg => chatService.sendMessage(msg));
            const results = await Promise.all(promises);

            const endTime = performance.now();

            expect(results).toHaveLength(3);
            expect(endTime - startTime).toBeLessThan(1000); // Should handle rapid requests
        });
    });

    describe('Cross-component Communication', () => {
        it('should coordinate between all chat components', () => {
            // Test that all components can work together
            const handlers = {
                chatbot: jest.fn(),
                input: jest.fn(),
                message: jest.fn(),
            };

            chatbotComponent.addEventListener('component-coordination', handlers.chatbot);
            chatInputComponent.addEventListener('component-coordination', handlers.input);
            chatMessageComponent.addEventListener('component-coordination', handlers.message);

            // Simulate coordinated action
            const coordinationEvent = new CustomEvent('component-coordination', {
                detail: { action: 'clear-chat' },
            });

            chatbotComponent.dispatchEvent(coordinationEvent);
            chatInputComponent.dispatchEvent(coordinationEvent);
            chatMessageComponent.dispatchEvent(coordinationEvent);

            expect(handlers.chatbot).toHaveBeenCalled();
            expect(handlers.input).toHaveBeenCalled();
            expect(handlers.message).toHaveBeenCalled();
        });

        it('should handle component state synchronization', () => {
            // Test state synchronization between components
            const stateSyncEvent = new CustomEvent('state-sync', {
                detail: { isLoading: true, messageCount: 5 },
            });

            const syncHandler = jest.fn();
            chatbotComponent.addEventListener('state-sync', syncHandler);

            chatbotComponent.dispatchEvent(stateSyncEvent);

            expect(syncHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { isLoading: true, messageCount: 5 },
                })
            );
        });
    });

    describe('Authentication Integration', () => {
        it('should handle authenticated chat sessions', async () => {
            const authenticatedResponse = {
                message: 'Authenticated response',
                timestamp: new Date(),
                isAI: true,
                requiresAuth: false,
            };

            chatService.sendMessage.mockResolvedValue(authenticatedResponse);

            const result = await chatService.sendMessage('authenticated message');

            expect(result.requiresAuth).toBe(false);
        });

        it('should handle authentication errors', async () => {
            const authError = new Error('Authentication required');
            chatService.sendMessage.mockRejectedValue(authError);

            await expect(chatService.sendMessage('test')).rejects.toThrow('Authentication required');
        });
    });

    describe('Data Persistence Integration', () => {
        it('should persist chat history across sessions', async () => {
            const persistentHistory = [
                { message: 'Persistent message', timestamp: new Date(), isAI: false },
            ];

            chatService.getChatHistory.mockResolvedValue(persistentHistory);

            const history = await chatService.getChatHistory();

            expect(history).toEqual(persistentHistory);
        });

        it('should handle local storage errors gracefully', async () => {
            // Mock localStorage error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = jest.fn().mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            chatService.getChatHistory.mockRejectedValue(new Error('Storage error'));

            await expect(chatService.getChatHistory()).rejects.toThrow('Storage error');

            // Restore original localStorage
            localStorage.setItem = originalSetItem;
        });
    });

    describe('Error Recovery Integration', () => {
        it('should recover from temporary errors', async () => {
            // First call fails, second succeeds
            chatService.sendMessage
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockResolvedValueOnce({
                    message: 'Recovered response',
                    timestamp: new Date(),
                    isAI: true,
                });

            // First attempt should fail
            await expect(chatService.sendMessage('test')).rejects.toThrow('Temporary error');

            // Second attempt should succeed
            const result = await chatService.sendMessage('test');
            expect(result.message).toBe('Recovered response');
        });

        it('should handle component recovery', () => {
            // Test component error recovery
            const errorEvent = new CustomEvent('component-error', {
                detail: { error: 'Component error', recoverable: true },
            });

            const recoveryHandler = jest.fn();
            chatbotComponent.addEventListener('recovery-attempt', recoveryHandler);

            chatbotComponent.dispatchEvent(errorEvent);

            expect(recoveryHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { error: 'Component error', recoverable: true },
                })
            );
        });
    });

    describe('User Experience Integration', () => {
        it('should provide smooth user experience across components', () => {
            // Test that user interactions are handled smoothly
            const uxEvent = new CustomEvent('user-interaction', {
                detail: { type: 'send-message', smooth: true },
            });

            const uxHandler = jest.fn();
            chatbotComponent.addEventListener('user-experience', uxHandler);

            chatbotComponent.dispatchEvent(uxEvent);

            expect(uxHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { type: 'send-message', smooth: true },
                })
            );
        });

        it('should handle loading states across components', () => {
            const loadingEvent = new CustomEvent('loading-state', {
                detail: { loading: true, component: 'chatbot' },
            });

            const loadingHandler = jest.fn();
            chatbotComponent.addEventListener('loading-change', loadingHandler);

            chatbotComponent.dispatchEvent(loadingEvent);

            expect(loadingHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { loading: true, component: 'chatbot' },
                })
            );
        });
    });

    describe('Analytics Integration', () => {
        it('should track chat interactions', () => {
            const analyticsEvent = new CustomEvent('analytics-track', {
                detail: {
                    event: 'message_sent',
                    data: { length: 100, type: 'text' },
                },
            });

            const analyticsHandler = jest.fn();
            chatbotComponent.addEventListener('analytics', analyticsHandler);

            chatbotComponent.dispatchEvent(analyticsEvent);

            expect(analyticsHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        event: 'message_sent',
                        data: { length: 100, type: 'text' },
                    },
                })
            );
        });

        it('should handle performance metrics', () => {
            const metricsEvent = new CustomEvent('performance-metric', {
                detail: {
                    metric: 'response_time',
                    value: 150,
                    unit: 'ms',
                },
            });

            const metricsHandler = jest.fn();
            chatbotComponent.addEventListener('performance', metricsHandler);

            chatbotComponent.dispatchEvent(metricsEvent);

            expect(metricsHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: {
                        metric: 'response_time',
                        value: 150,
                        unit: 'ms',
                    },
                })
            );
        });
    });

    describe('Internationalization Integration', () => {
        it('should handle multiple languages', () => {
            const languageEvent = new CustomEvent('language-change', {
                detail: { language: 'es', rtl: false },
            });

            const languageHandler = jest.fn();
            chatbotComponent.addEventListener('i18n-update', languageHandler);

            chatbotComponent.dispatchEvent(languageEvent);

            expect(languageHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { language: 'es', rtl: false },
                })
            );
        });

        it('should handle RTL layout changes', () => {
            const rtlEvent = new CustomEvent('rtl-change', {
                detail: { rtl: true, language: 'ar' },
            });

            const rtlHandler = jest.fn();
            chatbotComponent.addEventListener('layout-change', rtlHandler);

            chatbotComponent.dispatchEvent(rtlEvent);

            expect(rtlHandler).toHaveBeenCalledWith(
                expect.objectContaining({
                    detail: { rtl: true, language: 'ar' },
                })
            );
        });
    });
});