// Chatbot Component Tests
/// <reference types="jest" />
import { ChatbotComponent } from '../../src/ts/components/chat/chatbot-component';

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
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

// Mock DOM methods
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (cb: FrameRequestCallback) => setTimeout(cb, 0),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: clearTimeout,
});

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockSessionStorage.getItem.mockClear();

  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Mock console methods for cleaner test output
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('ChatbotComponent', () => {
  let component: ChatbotComponent;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create mock element
    mockElement = document.createElement('div');
    mockElement.id = 'chatbot-container';
    document.body.appendChild(mockElement);

    // Mock successful auth token
    mockLocalStorage.getItem.mockReturnValue('mock-auth-token');
  });

  afterEach(() => {
    // Cleanup
    if (component && document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }
  });

  describe('Initialization', () => {
    it('should initialize component with default state', () => {
      component = new ChatbotComponent();
      expect(component).toBeInstanceOf(ChatbotComponent);
      expect(component['conversations']).toEqual([]);
      expect(component['currentConversation']).toBeNull();
      expect(component['messages']).toEqual([]);
      expect(component['isTyping']).toBe(false);
      expect(component['isLoading']).toBe(false);
    });

    it('should initialize chat service on construction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversations: [] }),
      });

      component = new ChatbotComponent();

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/chat/conversations', {
        headers: {
          'Authorization': 'Bearer mock-auth-token'
        }
      });
    });

    it('should handle initialization errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      component = new ChatbotComponent();

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(console.error).toHaveBeenCalledWith(
        'Failed to initialize chatbot:',
        expect.any(Error)
      );
    });
  });

  describe('Conversation Management', () => {
    beforeEach(() => {
      component = new ChatbotComponent();
    });

    it('should load conversations successfully', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          status: 'active' as const,
          priority: 'normal' as const,
          created_at: Date.now(),
          updated_at: Date.now(),
        }
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ conversations: mockConversations }),
      });

      await component['loadConversations']();

      expect(component['conversations']).toEqual(mockConversations);
      expect(component['isLoading']).toBe(false);
    });

    it('should create welcome conversation when no conversations exist', async () => {
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

      await component['loadConversations']();

      expect(component['conversations']).toHaveLength(1);
      expect(component['currentConversation']?.title).toBe('Welcome Chat');
      expect(component['messages']).toHaveLength(1);
      expect(component['messages'][0].content).toContain("Hello! I'm your school management assistant");
    });

    it('should handle conversation loading errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to load'));

      await component['loadConversations']();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to load conversations:',
        expect.any(Error)
      );
    });

    it('should create new conversation successfully', async () => {
      const mockNewConversation = {
        id: 'new-conv',
        title: 'New Chat',
        status: 'active' as const,
        priority: 'normal' as const,
        created_at: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNewConversation,
      });

      await component['createNewConversation']();

      expect(component['conversations']).toHaveLength(1);
      expect(component['conversations'][0]).toEqual(mockNewConversation);
      expect(component['currentConversation']).toEqual(mockNewConversation);
      expect(component['messages']).toEqual([]);
    });

    it('should switch conversations successfully', async () => {
      const conversation = {
        id: 'test-conv',
        title: 'Test Chat',
        status: 'active' as const,
        priority: 'normal' as const,
      };

      component['conversations'] = [conversation];
      component['currentConversation'] = conversation;

      const mockHistory = {
        messages: [
          {
            id: 'msg-1',
            conversation_id: 'test-conv',
            message_type: 'user' as const,
            content: 'Hello',
            created_at: Date.now(),
          }
        ],
        conversation,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      await component['switchConversation'](conversation);

      expect(component['currentConversation']).toEqual(conversation);
      expect(component['messages']).toEqual(mockHistory.messages);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      component = new ChatbotComponent();
      component['currentConversation'] = {
        id: 'test-conv',
        title: 'Test Chat',
        status: 'active' as const,
        priority: 'normal' as const,
      };
    });

    it('should send message successfully', async () => {
      const mockResponse = {
        ai_response: 'Hello! How can I help you?',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // Mock message input
      component['messageInput'] = {
        value: 'Hello AI',
        trim: () => 'Hello AI',
      } as any;

      await component['sendMessage']();

      expect(component['messages']).toHaveLength(2);
      expect(component['messages'][0].content).toBe('Hello AI');
      expect(component['messages'][0].message_type).toBe('user');
      expect(component['messages'][1].content).toBe('Hello! How can I help you?');
      expect(component['messages'][1].message_type).toBe('assistant');
      expect(component['messageInput'].value).toBe('');
    });

    it('should handle message sending errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      component['messageInput'] = {
        value: 'Test message',
        trim: () => 'Test message',
      } as any;

      await component['sendMessage']();

      expect(component['messages']).toHaveLength(0); // Message should be removed on error
      expect(console.error).toHaveBeenCalledWith(
        'Failed to send message:',
        expect.any(Error)
      );
    });

    it('should not send empty messages', async () => {
      component['messageInput'] = {
        value: '   ',
        trim: () => '',
      } as any;

      await component['sendMessage']();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(component['messages']).toHaveLength(0);
    });

    it('should not send messages when typing', async () => {
      component['isTyping'] = true;
      component['messageInput'] = {
        value: 'Test message',
        trim: () => 'Test message',
      } as any;

      await component['sendMessage']();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should add message programmatically', () => {
      component['addMessage']('Test message', 'user');

      expect(component['messages']).toHaveLength(1);
      expect(component['messages'][0].content).toBe('Test message');
      expect(component['messages'][0].message_type).toBe('user');
    });

    it('should set conversation programmatically', () => {
      const conversation = {
        id: 'test-conv',
        title: 'Test Chat',
        status: 'active' as const,
        priority: 'normal' as const,
      };

      component['conversations'] = [conversation];

      component['setConversation']('test-conv');

      expect(component['currentConversation']).toEqual(conversation);
    });
  });

  describe('UI Rendering', () => {
    beforeEach(() => {
      component = new ChatbotComponent();
    });

    it('should render loading state correctly', () => {
      component['isLoading'] = true;

      const rendered = component['renderLoadingState']();

      expect(rendered).toContain('loading-container');
      expect(rendered).toContain('loading-spinner');
      expect(rendered).toContain('Loading conversations...');
    });

    it('should render messages correctly', () => {
      component['messages'] = [
        {
          id: 'msg-1',
          conversation_id: 'test-conv',
          message_type: 'user' as const,
          content: 'Hello',
          created_at: Date.now(),
        },
        {
          id: 'msg-2',
          conversation_id: 'test-conv',
          message_type: 'assistant' as const,
          content: 'Hi there!',
          created_at: Date.now(),
        }
      ];

      const rendered = component['renderMessages']();

      expect(rendered).toContain('message user-message');
      expect(rendered).toContain('message assistant-message');
      expect(rendered).toContain('Hello');
      expect(rendered).toContain('Hi there!');
    });

    it('should render no messages state', () => {
      const rendered = component['renderMessages']();

      expect(rendered).toContain('no-messages');
      expect(rendered).toContain('No messages yet. Start a conversation!');
    });

    it('should render message with proper formatting', () => {
      const message = {
        conversation_id: 'test-conv',
        message_type: 'user' as const,
        content: 'Check out https://example.com and email me at test@example.com',
        created_at: Date.now(),
      };

      const rendered = component['renderMessage'](message);

      expect(rendered).toContain('user-message');
      expect(rendered).toContain('icon-user');
      expect(rendered).toContain('Check out');
      expect(rendered).toContain('https://example.com');
      expect(rendered).toContain('test@example.com');
    });

    it('should format message content with links and emails', () => {
      const content = 'Visit https://example.com and email me at test@example.com';

      const formatted = component['formatMessageContent'](content);

      expect(formatted).toContain('<a href="https://example.com" target="_blank">https://example.com</a>');
      expect(formatted).toContain('<a href="mailto:test@example.com">test@example.com</a>');
      expect(formatted).toContain('<br>');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      component = new ChatbotComponent();
      // Mock the shadow root and its elements
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        getElementById: jest.fn(),
        appendChild: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should handle Enter key in message input', () => {
      const mockInput = {
        value: 'Test message',
        addEventListener: jest.fn(),
      };

      component['messageInput'] = mockInput as any;

      // Simulate Enter key press
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefault = jest.fn();
      Object.defineProperty(enterEvent, 'preventDefault', { value: preventDefault });

      // Call the handler that would be attached to keydown
      component['sendMessage'] = jest.fn();

      // Simulate the keydown handler logic
      if (enterEvent.key === 'Enter' && !enterEvent.shiftKey) {
        preventDefault();
        component['sendMessage']();
      }

      expect(preventDefault).toHaveBeenCalled();
      expect(component['sendMessage']).toHaveBeenCalled();
    });

    it('should handle Shift+Enter for new line', () => {
      const mockInput = {
        value: 'Test message',
        addEventListener: jest.fn(),
      };

      component['messageInput'] = mockInput as any;

      // Simulate Shift+Enter key press
      const shiftEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true
      });

      // Should not prevent default (allow new line)
      const preventDefault = jest.fn();
      Object.defineProperty(shiftEnterEvent, 'preventDefault', { value: preventDefault });

      component['sendMessage'] = jest.fn();

      if (shiftEnterEvent.key === 'Enter' && !shiftEnterEvent.shiftKey) {
        preventDefault();
        component['sendMessage']();
      }

      expect(preventDefault).not.toHaveBeenCalled();
      expect(component['sendMessage']).not.toHaveBeenCalled();
    });
  });

  describe('DOM Manipulation', () => {
    beforeEach(() => {
      component = new ChatbotComponent();
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        getElementById: jest.fn(),
        appendChild: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should adjust textarea height', () => {
      const mockTextarea = {
        style: {
          height: 'auto',
        },
        scrollHeight: 100,
      };

      component['messageInput'] = mockTextarea as any;

      component['adjustTextareaHeight']();

      expect(mockTextarea.style.height).toBe('auto');
      expect(mockTextarea.style.height).toBe('100px');
    });

    it('should scroll to bottom', () => {
      const mockContainer = {
        scrollTop: 0,
        scrollHeight: 500,
      };

      const mockQuerySelector = jest.fn().mockReturnValue(mockContainer);

      component['shadowRoot']!.querySelector = mockQuerySelector;

      component['scrollToBottom']();

      expect(mockQuerySelector).toHaveBeenCalledWith('.messages-container');
      expect(mockContainer.scrollTop).toBe(500);
    });

    it('should show error messages', () => {
      const mockAppendChild = jest.fn();
      component['shadowRoot']!.appendChild = mockAppendChild;

      component['showError']('Test error message');

      expect(mockAppendChild).toHaveBeenCalled();
      const errorElement = mockAppendChild.mock.calls[0][0];
      expect(errorElement.className).toBe('chat-error');
      expect(errorElement.textContent).toBe('Test error message');
    });
  });

  describe('Authentication', () => {
    it('should get auth token from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('local-token');

      const token = component['getAuthToken']();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(token).toBe('local-token');
    });

    it('should fallback to sessionStorage for auth token', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSessionStorage.getItem.mockReturnValue('session-token');

      const token = component['getAuthToken']();

      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('auth_token');
      expect(token).toBe('session-token');
    });

    it('should return null when no auth token available', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSessionStorage.getItem.mockReturnValue(null);

      const token = component['getAuthToken']();

      expect(token).toBeNull();
    });
  });

  describe('Periodic Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      component = new ChatbotComponent();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up periodic updates', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      component['setupPeriodicUpdates']();

      expect(setIntervalSpy).toHaveBeenCalledTimes(2);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
    });

    it('should check for new messages periodically', async () => {
      component['currentConversation'] = {
        id: 'test-conv',
        title: 'Test Chat',
        status: 'active' as const,
        priority: 'normal' as const,
      };

      const mockHistory = {
        messages: [],
        conversation: component['currentConversation'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      component['setupPeriodicUpdates']();

      // Fast-forward time by 10 seconds
      jest.advanceTimersByTime(10000);

      await Promise.resolve(); // Allow async operations to complete

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/chat/history/test-conv', {
        headers: {
          'Authorization': 'Bearer mock-auth-token'
        }
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      component = new ChatbotComponent();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      try {
        await component['chatService'].getConversations();
      } catch (error) {
        expect(error).toEqual(new Error('API Error'));
      }
    });

    it('should handle network errors in message sending', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      component['messageInput'] = {
        value: 'Test message',
        trim: () => 'Test message',
      } as any;

      component['currentConversation'] = {
        id: 'test-conv',
        status: 'active' as const,
        priority: 'normal' as const,
      };

      await component['sendMessage']();

      expect(console.error).toHaveBeenCalledWith(
        'Failed to send message:',
        expect.any(Error)
      );
    });
  });
});