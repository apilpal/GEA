/// <reference types="jest" />
// Chat Components Integration Tests
import { ChatbotComponent } from '../../src/ts/components/chat/chatbot-component';
import { ChatMessageComponent } from '../../src/ts/components/chat/chat-message-component';
import { ChatInputComponent } from '../../src/ts/components/chat/chat-input-component';

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

describe('Chat Components Integration', () => {
  let chatbotComponent: ChatbotComponent;
  let chatInputComponent: ChatInputComponent;
  let chatMessageComponent: ChatMessageComponent;
  let mockContainer: HTMLElement;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Create mock container
    mockContainer = document.createElement('div');
    mockContainer.id = 'chat-integration-container';
    document.body.appendChild(mockContainer);

    // Mock successful auth token
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');

    // Mock fetch responses
    mockFetch.mockClear();

    // Create component instances
    chatbotComponent = new ChatbotComponent();
    chatInputComponent = new ChatInputComponent({});
    chatMessageComponent = new ChatMessageComponent({
      message: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        message_type: 'user',
        content: 'Test message',
        created_at: Date.now(),
      },
    });
  });

  afterEach(() => {
    // Cleanup
    if (document.body.contains(mockContainer)) {
      document.body.removeChild(mockContainer);
    }
  });

  describe('Component Communication', () => {
    it('should integrate chatbot with input component', () => {
      // Test that chatbot can use input component functionality
      expect(chatbotComponent).toBeInstanceOf(ChatbotComponent);
      expect(chatInputComponent).toBeInstanceOf(ChatInputComponent);

      // Test that input component can send messages to chatbot
      const mockOnSend = jest.fn();
      chatInputComponent['props'].onSend = mockOnSend;

      chatInputComponent.setContent('Hello chatbot');
      chatInputComponent['sendMessage']();

      expect(mockOnSend).toHaveBeenCalledWith('Hello chatbot');
    });

    it('should integrate chatbot with message component', () => {
      // Test that chatbot can display messages using message component
      expect(chatbotComponent).toBeInstanceOf(ChatbotComponent);
      expect(chatMessageComponent).toBeInstanceOf(ChatMessageComponent);

      // Test message formatting
      const formattedContent = chatMessageComponent['formatMessageContent']('Test with https://example.com');
      expect(formattedContent).toContain('<a href="https://example.com"');
    });

    it('should handle complete message flow', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ai_response: 'Hello! I received your message.',
        }),
      });

      // Set up chatbot with conversation
      chatbotComponent['currentConversation'] = {
        id: 'test-conv',
        title: 'Test Chat',
        status: 'active',
        priority: 'normal',
      };

      // Set up input component
      chatInputComponent['props'].onSend = (content: string) => {
        chatbotComponent['addMessage'](content, 'user');
      };

      // Simulate message flow
      chatInputComponent.setContent('Hello AI');
      chatInputComponent['sendMessage']();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(chatbotComponent['messages'].length).toBeGreaterThan(0);
    });
  });

  describe('State Synchronization', () => {
    it('should maintain consistent state across components', () => {
      // Test that components maintain their own state correctly
      chatbotComponent['messages'] = [
        {
          id: 'msg-1',
          conversation_id: 'conv-1',
          message_type: 'user',
          content: 'Hello',
          created_at: Date.now(),
        }
      ];

      chatInputComponent.setContent('Response message');

      expect(chatbotComponent['messages'][0].content).toBe('Hello');
      expect(chatInputComponent.getContent()).toBe('Response message');
    });

    it('should handle conversation switching across components', async () => {
      // Set up initial conversation in chatbot
      const conversation1 = {
        id: 'conv-1',
        title: 'Chat 1',
        status: 'active' as const,
        priority: 'normal' as const,
      };

      const conversation2 = {
        id: 'conv-2',
        title: 'Chat 2',
        status: 'active' as const,
        priority: 'normal' as const,
      };

      chatbotComponent['conversations'] = [conversation1, conversation2];
      chatbotComponent['currentConversation'] = conversation1;

      // Mock conversation history API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              message_type: 'user',
              content: 'Message in chat 1',
              created_at: Date.now(),
            }
          ],
          conversation: conversation1,
        }),
      });

      await chatbotComponent['switchConversation'](conversation2);

      expect(chatbotComponent['currentConversation']).toEqual(conversation2);
    });

    it('should synchronize typing state between input and chatbot', () => {
      // Test typing state management
      chatInputComponent['props'].onTyping = (isTyping: boolean) => {
        if (isTyping) {
          chatbotComponent['isTyping'] = true;
        } else {
          chatbotComponent['isTyping'] = false;
        }
      };

      chatInputComponent.setContent('Typing...');
      chatInputComponent['handleTypingChange'](true);

      expect(chatbotComponent['isTyping']).toBe(true);

      chatInputComponent['handleTypingChange'](false);
      expect(chatbotComponent['isTyping']).toBe(false);
    });
  });

  describe('Event Flow Integration', () => {
    it('should handle input to chatbot message flow', () => {
      // Set up message handler
      chatbotComponent['currentConversation'] = {
        id: 'test-conv',
        title: 'Test Chat',
        status: 'active',
        priority: 'normal',
      };

      const mockAddMessage = jest.spyOn(chatbotComponent as any, 'addMessage');

      // Simulate input component sending message
      chatInputComponent['props'].onSend = (content: string) => {
        mockAddMessage.call(chatbotComponent, content, 'user');
      };

      chatInputComponent.setContent('Integration test message');
      chatInputComponent['sendMessage']();

      expect(mockAddMessage).toHaveBeenCalledWith('Integration test message', 'user');
    });

    it('should handle chatbot response flow', async () => {
      // Mock API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ai_response: 'This is a response from the AI assistant.',
        }),
      });

      chatbotComponent['currentConversation'] = {
        id: 'test-conv',
        status: 'active',
        priority: 'normal',
      };

      chatbotComponent['messageInput'] = {
        value: 'Test question',
        trim: () => 'Test question',
      } as any;

      await chatbotComponent['sendMessage']();

      expect(chatbotComponent['messages'].length).toBe(2);
      expect(chatbotComponent['messages'][0].message_type).toBe('user');
      expect(chatbotComponent['messages'][1].message_type).toBe('assistant');
    });

    it('should handle message editing flow', () => {
      // Set up message component with edit handlers
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();

      chatMessageComponent['props'].onEdit = mockOnEdit;
      chatMessageComponent['props'].onDelete = mockOnDelete;

      // Test edit flow
      chatMessageComponent['isEditing'] = true;
      chatMessageComponent['editContent'] = 'Edited message content';
      chatMessageComponent['saveEdit']();

      expect(mockOnEdit).toHaveBeenCalledWith('msg-1', 'Edited message content');

      // Test delete flow
      chatMessageComponent['handleDelete']();
      expect(mockOnDelete).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors across components', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      chatbotComponent['currentConversation'] = {
        id: 'test-conv',
        status: 'active',
        priority: 'normal',
      };

      chatbotComponent['messageInput'] = {
        value: 'Test message',
        trim: () => 'Test message',
      } as any;

      await chatbotComponent['sendMessage']();

      // Should handle error gracefully
      expect(chatbotComponent['messages'].length).toBe(0); // Message removed on error
    });

    it('should handle component initialization errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Initialization failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const errorComponent = new ChatbotComponent();

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize chatbot:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle malformed data gracefully', () => {
      // Test with malformed message data
      const malformedMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        message_type: 'invalid_type',
        content: null,
        created_at: 'invalid_date',
      };

      expect(() => {
        new ChatMessageComponent({
          message: malformedMessage as any,
        });
      }).not.toThrow();

      // Test with missing required props
      expect(() => {
        new ChatInputComponent({});
      }).not.toThrow();
    });
  });

  describe('DOM Integration', () => {
    it('should handle DOM manipulation across components', () => {
      // Test that components can manipulate DOM independently
      const messageElement = chatMessageComponent['render']();
      const inputElement = chatInputComponent['render']();

      expect(typeof messageElement).toBe('string');
      expect(typeof inputElement).toBe('string');
      expect(messageElement).toContain('message-wrapper');
      expect(inputElement).toContain('chat-input-container');
    });

    it('should handle component mounting and unmounting', () => {
      // Test component cleanup
      chatInputComponent['typingTimer'] = 12345 as any;

      expect(() => {
        chatInputComponent.disconnectedCallback();
      }).not.toThrow();

      expect(chatInputComponent['typingTimer']).toBeNull();
    });

    it('should handle shadow DOM operations', () => {
      // Mock shadow root for all components
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        appendChild: jest.fn(),
      };

      Object.defineProperty(chatbotComponent, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });

      Object.defineProperty(chatInputComponent, 'shadowRoot', {
        value: { ...mockShadowRoot },
        writable: true,
      });

      Object.defineProperty(chatMessageComponent, 'shadowRoot', {
        value: { ...mockShadowRoot },
        writable: true,
      });

      // Test shadow DOM operations
      chatbotComponent['showError']('Test error');
      chatInputComponent['render']();
      chatMessageComponent['render']();

      expect(chatbotComponent['shadowRoot']!.appendChild).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large message lists efficiently', () => {
      // Create large message list
      const largeMessageList = Array.from({ length: 1000 }, (_, index) => ({
        id: `msg-${index}`,
        conversation_id: 'conv-1',
        message_type: 'user' as const,
        content: `Message ${index}`,
        created_at: Date.now(),
      }));

      chatbotComponent['messages'] = largeMessageList;

      expect(chatbotComponent['messages']).toHaveLength(1000);

      // Test rendering performance (should not throw)
      expect(() => {
        chatbotComponent['renderMessages']();
      }).not.toThrow();
    });

    it('should handle rapid message sending', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          ai_response: 'Response',
        }),
      });

      chatbotComponent['currentConversation'] = {
        id: 'test-conv',
        status: 'active',
        priority: 'normal',
      };

      // Simulate rapid message sending
      const messages = ['Message 1', 'Message 2', 'Message 3'];

      for (const message of messages) {
        chatbotComponent['messageInput'] = {
          value: message,
          trim: () => message,
        } as any;

        await chatbotComponent['sendMessage']();
      }

      expect(chatbotComponent['messages'].length).toBe(6); // 3 user + 3 assistant messages
    });

    it('should handle component state updates efficiently', () => {
      // Test rapid state updates
      for (let i = 0; i < 100; i++) {
        chatInputComponent.setContent(`Message ${i}`);
        chatMessageComponent.updateProps({
          message: {
            id: 'msg-1',
            conversation_id: 'conv-1',
            message_type: 'user',
            content: `Updated ${i}`,
            created_at: Date.now(),
          },
        });
      }

      expect(chatInputComponent.getContent()).toBe('Message 99');
      expect(chatMessageComponent['props'].message.content).toBe('Updated 99');
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility across components', () => {
      // Test ARIA attributes and roles
      const messageRender = chatMessageComponent['render']();
      const inputRender = chatInputComponent['render']();

      expect(messageRender).toContain('role="img"');
      expect(messageRender).toContain('aria-label');
      expect(inputRender).toContain('aria-label');
      expect(inputRender).toContain('placeholder');
    });

    it('should handle keyboard navigation between components', () => {
      // Test focus management
      chatInputComponent['textarea'] = { focus: jest.fn() } as any;

      chatInputComponent.focus();

      expect(chatInputComponent['textarea']!.focus).toHaveBeenCalled();

      // Test message focus
      chatMessageComponent['shadowRoot'] = {
        querySelector: jest.fn().mockReturnValue({
          focus: jest.fn(),
        }),
      } as any;

      chatMessageComponent.focus();

      expect(chatMessageComponent['shadowRoot']!.querySelector).toHaveBeenCalledWith('.message-wrapper');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle complete chat session workflow', async () => {
      // 1. Initialize chatbot
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ conversations: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'welcome-conv',
            title: 'Welcome Chat',
            status: 'active',
            priority: 'normal',
          }),
        });

      // Initialize chatbot
      await chatbotComponent['loadConversations']();

      // 2. Send first message
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ai_response: 'Hello! How can I help you today?',
        }),
      });

      chatbotComponent['currentConversation'] = chatbotComponent['conversations'][0];
      chatbotComponent['messageInput'] = {
        value: 'Hello AI',
        trim: () => 'Hello AI',
      } as any;

      await chatbotComponent['sendMessage']();

      // 3. Send follow-up message
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ai_response: 'I understand you need help with student information.',
        }),
      });

      chatbotComponent['messageInput'] = {
        value: 'Show me student information',
        trim: () => 'Show me student information',
      } as any;

      await chatbotComponent['sendMessage']();

      expect(chatbotComponent['messages'].length).toBe(4); // Welcome + 2 user + 2 assistant
      expect(chatbotComponent['conversations'][0].message_count).toBe(4);
    });

    it('should handle conversation management workflow', async () => {
      // Create multiple conversations
      const conversations = [
        {
          id: 'conv-1',
          title: 'Chat 1',
          status: 'active' as const,
          priority: 'normal' as const,
        },
        {
          id: 'conv-2',
          title: 'Chat 2',
          status: 'active' as const,
          priority: 'normal' as const,
        },
      ];

      chatbotComponent['conversations'] = conversations;
      chatbotComponent['currentConversation'] = conversations[0];

      // Mock conversation history
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [
            {
              id: 'msg-1',
              conversation_id: 'conv-2',
              message_type: 'user',
              content: 'Message in chat 2',
              created_at: Date.now(),
            }
          ],
          conversation: conversations[1],
        }),
      });

      await chatbotComponent['switchConversation'](conversations[1]);

      expect(chatbotComponent['currentConversation']).toEqual(conversations[1]);
      expect(chatbotComponent['messages'][0].content).toBe('Message in chat 2');
    });

    it('should handle error recovery workflow', async () => {
      // 1. Failed message sending
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      chatbotComponent['currentConversation'] = {
        id: 'test-conv',
        status: 'active',
        priority: 'normal',
      };

      chatbotComponent['messageInput'] = {
        value: 'Test message',
        trim: () => 'Test message',
      } as any;

      await chatbotComponent['sendMessage']();

      expect(chatbotComponent['messages'].length).toBe(0); // Message removed on error

      // 2. Retry with successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ai_response: 'Success! Message sent.',
        }),
      });

      await chatbotComponent['sendMessage']();

      expect(chatbotComponent['messages'].length).toBe(2); // User + Assistant message
    });
  });
});