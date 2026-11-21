/// <reference types="jest" />
// Chat Input Component Tests
import { ChatInputComponent } from '../../src/ts/components/chat/chat-input-component';

describe('ChatInputComponent', () => {
  let component: ChatInputComponent;
  let mockElement: HTMLElement;

  const defaultProps = {
    placeholder: 'Type your message...',
    maxLength: 1000,
    disabled: false,
    showSendButton: true,
    showAttachmentButton: true,
    showVoiceButton: false,
    autoFocus: false,
    allowMultiline: true,
    onSend: jest.fn(),
    onTyping: jest.fn(),
  };

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Create component instance
    component = new ChatInputComponent(defaultProps);

    // Create mock element
    mockElement = document.createElement('div');
    mockElement.id = 'chat-input';
    document.body.appendChild(mockElement);

    // Mock Speech Recognition API
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: jest.fn().mockImplementation(() => ({
        continuous: false,
        interimResults: false,
        lang: 'en-US',
        onstart: null,
        onresult: null,
        onerror: null,
        onend: null,
        start: jest.fn(),
        stop: jest.fn(),
      })),
      writable: true,
    });

    Object.defineProperty(window, 'SpeechRecognition', {
      value: window.webkitSpeechRecognition,
      writable: true,
    });
  });

  afterEach(() => {
    // Cleanup
    if (component && document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }

    // Clean up timers
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with provided props', () => {
      expect(component).toBeInstanceOf(ChatInputComponent);
      expect(component['props']).toEqual(defaultProps);
      expect(component['state'].content).toBe('');
      expect(component['state'].isTyping).toBe(false);
      expect(component['state'].isRecording).toBe(false);
    });

    it('should initialize with default props when not provided', () => {
      const minimalComponent = new ChatInputComponent({});

      expect(minimalComponent['props'].placeholder).toBe("Type your message... (e.g., 'Show me student information for Priya')");
      expect(minimalComponent['props'].maxLength).toBe(1000);
      expect(minimalComponent['props'].disabled).toBe(false);
      expect(minimalComponent['props'].showSendButton).toBe(true);
    });

    it('should initialize speech recognition when supported', () => {
      expect(component['recognition']).toBeDefined();
      expect(component['recognition']).not.toBeNull();
    });

    it('should handle missing speech recognition API gracefully', () => {
      // Temporarily remove Speech Recognition
      const originalSpeechRecognition = (window as any).webkitSpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const componentWithoutSpeech = new ChatInputComponent(defaultProps);

      expect(componentWithoutSpeech['recognition']).toBeNull();

      // Restore Speech Recognition
      (window as any).webkitSpeechRecognition = originalSpeechRecognition;
    });
  });

  describe('Content Management', () => {
    beforeEach(() => {
      // Mock shadow root and textarea
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });

      component['textarea'] = {
        value: '',
        selectionStart: 0,
        selectionEnd: 0,
        focus: jest.fn(),
        style: { height: 'auto' },
        scrollHeight: 40,
      } as any;
    });

    it('should update content correctly', () => {
      const testContent = 'Hello, world!';
      component['updateContent'](testContent);

      expect(component['state'].content).toBe(testContent);
      expect(component['textarea'].style.height).toBe('auto');
      expect(component['textarea'].style.height).toBe('40px');
    });

    it('should insert text at cursor position', () => {
      component['state'].content = 'Hello world';
      component['textarea'].selectionStart = 6;
      component['textarea'].selectionEnd = 6;

      component['insertText']('beautiful ');

      expect(component['state'].content).toBe('Hello beautiful world');
      expect(component['textarea'].selectionStart).toBe(17); // After inserted text
    });

    it('should handle text insertion at beginning', () => {
      component['state'].content = 'world';
      component['textarea'].selectionStart = 0;
      component['textarea'].selectionEnd = 0;

      component['insertText']('Hello ');

      expect(component['state'].content).toBe('Hello world');
    });

    it('should handle text insertion at end', () => {
      component['state'].content = 'Hello';
      component['textarea'].selectionStart = 5;
      component['textarea'].selectionEnd = 5;

      component['insertText'](' world');

      expect(component['state'].content).toBe('Hello world');
    });

    it('should set and get content using public methods', () => {
      component.setContent('Test content');
      expect(component.getContent()).toBe('Test content');

      component.setContent('');
      expect(component.getContent()).toBe('');
    });

    it('should clear content correctly', () => {
      component['state'].content = 'Some content';
      component['textarea'].value = 'Some content';

      component.clear();

      expect(component['state'].content).toBe('');
      expect(component['textarea'].value).toBe('');
    });
  });

  describe('Typing State Management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      component['props'].onTyping = jest.fn();

      // Mock shadow root
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle typing state changes', () => {
      component['handleTypingChange'](true);

      expect(component['state'].isTyping).toBe(true);
      expect(component['props'].onTyping).toHaveBeenCalledWith(true);

      // Should set timer to stop typing after 3 seconds
      jest.advanceTimersByTime(5173);

      expect(component['state'].isTyping).toBe(false);
      expect(component['props'].onTyping).toHaveBeenCalledWith(false);
    });

    it('should clear existing timer when typing state changes', () => {
      component['handleTypingChange'](true);
      expect(component['typingTimer']).not.toBeNull();

      component['handleTypingChange'](false);
      expect(component['typingTimer']).toBeNull();
    });

    it('should not trigger onTyping callback when state unchanged', () => {
      component['state'].isTyping = true;
      component['props'].onTyping = jest.fn();

      component['handleTypingChange'](true);

      expect(component['props'].onTyping).not.toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    beforeEach(() => {
      component['props'].onSend = jest.fn();

      // Mock shadow root
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should send message with valid content', () => {
      component['state'].content = 'Hello, world!';
      component['props'].disabled = false;

      component['sendMessage']();

      expect(component['props'].onSend).toHaveBeenCalledWith('Hello, world!');
      expect(component['state'].content).toBe('');
    });

    it('should not send empty message', () => {
      component['state'].content = '   ';
      component['props'].disabled = false;

      component['sendMessage']();

      expect(component['props'].onSend).not.toHaveBeenCalled();
    });

    it('should not send message when disabled', () => {
      component['state'].content = 'Hello, world!';
      component['props'].disabled = true;

      component['sendMessage']();

      expect(component['props'].onSend).not.toHaveBeenCalled();
    });

    it('should clear typing state after sending', () => {
      component['state'].content = 'Hello, world!';
      component['state'].isTyping = true;
      component['typingTimer'] = 12345 as any;
      component['props'].disabled = false;

      component['sendMessage']();

      expect(component['state'].isTyping).toBe(false);
      expect(component['typingTimer']).toBeNull();
      expect(component['props'].onTyping).toHaveBeenCalledWith(false);
    });
  });

  describe('Suggestions', () => {
    beforeEach(() => {
      // Mock shadow root
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should show suggestions for partial matches', () => {
      component['updateSuggestions']('Show me student');

      expect(component['state'].suggestions.length).toBeGreaterThan(0);
      expect(component['state'].showSuggestions).toBe(true);
      expect(component['state'].suggestions.some(s => s.includes('student'))).toBe(true);
    });

    it('should filter suggestions based on input', () => {
      component['updateSuggestions']('driver');

      expect(component['state'].suggestions.length).toBeGreaterThan(0);
      expect(component['state'].suggestions.every(s => s.toLowerCase().includes('driver'))).toBe(true);
    });

    it('should limit suggestions to 5 items', () => {
      component['updateSuggestions']('s'); // Very broad match

      expect(component['state'].suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should hide suggestions for short input', () => {
      component['updateSuggestions']('s');

      expect(component['state'].showSuggestions).toBe(false);
    });

    it('should hide suggestions for empty input', () => {
      component['updateSuggestions']('');

      expect(component['state'].suggestions).toEqual([]);
      expect(component['state'].showSuggestions).toBe(false);
    });

    it('should navigate suggestions with arrow keys', () => {
      component['updateSuggestions']('Show me student');
      component['state'].selectedSuggestionIndex = 0;

      component['navigateSuggestions'](1); // Down

      expect(component['state'].selectedSuggestionIndex).toBe(1);

      component['navigateSuggestions'](-1); // Up

      expect(component['state'].selectedSuggestionIndex).toBe(0);
    });

    it('should wrap around when navigating suggestions', () => {
      component['updateSuggestions']('Show me student');
      component['state'].selectedSuggestionIndex = component['state'].suggestions.length - 1;

      component['navigateSuggestions'](1); // Should wrap to beginning

      expect(component['state'].selectedSuggestionIndex).toBe(0);

      component['state'].selectedSuggestionIndex = 0;
      component['navigateSuggestions'](-1); // Should wrap to end

      expect(component['state'].selectedSuggestionIndex).toBe(component['state'].suggestions.length - 1);
    });

    it('should select suggestion and insert it', () => {
      component['state'].content = 'Show me ';
      component['updateSuggestions']('Show me student');
      const suggestionIndex = 0;

      component['selectSuggestion'](suggestionIndex);

      expect(component['state'].content).toContain(component['state'].suggestions[suggestionIndex]);
      expect(component['state'].showSuggestions).toBe(false);
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      component['props'].onSend = jest.fn();

      // Mock shadow root
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should handle Enter key to send message', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(enterEvent, 'preventDefault', { value: jest.fn() });

      component['state'].content = 'Hello';
      component['props'].allowMultiline = false;

      component['handleKeyDown'](enterEvent);

      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(component['props'].onSend).toHaveBeenCalledWith('Hello');
    });

    it('should handle Ctrl+Enter to send message', () => {
      const ctrlEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
      });
      Object.defineProperty(ctrlEnterEvent, 'preventDefault', { value: jest.fn() });

      component['state'].content = 'Hello';

      component['handleKeyDown'](ctrlEnterEvent);

      expect(ctrlEnterEvent.preventDefault).toHaveBeenCalled();
      expect(component['props'].onSend).toHaveBeenCalledWith('Hello');
    });

    it('should handle Cmd+Enter to send message on Mac', () => {
      const cmdEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
      });
      Object.defineProperty(cmdEnterEvent, 'preventDefault', { value: jest.fn() });

      component['state'].content = 'Hello';

      component['handleKeyDown'](cmdEnterEvent);

      expect(cmdEnterEvent.preventDefault).toHaveBeenCalled();
      expect(component['props'].onSend).toHaveBeenCalledWith('Hello');
    });

    it('should allow Enter for new line when multiline is enabled', () => {
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(enterEvent, 'preventDefault', { value: jest.fn() });

      component['state'].content = 'Hello';
      component['props'].allowMultiline = true;

      component['handleKeyDown'](enterEvent);

      expect(enterEvent.preventDefault).not.toHaveBeenCalled();
      expect(component['props'].onSend).not.toHaveBeenCalled();
    });

    it('should navigate suggestions with arrow keys', () => {
      component['state'].showSuggestions = true;
      component['state'].suggestions = ['Suggestion 1', 'Suggestion 2'];
      component['state'].selectedSuggestionIndex = 0;

      const navigateSuggestionsSpy = jest.spyOn(component as any, 'navigateSuggestions');

      const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      Object.defineProperty(arrowDownEvent, 'preventDefault', { value: jest.fn() });

      component['handleKeyDown'](arrowDownEvent);

      expect(arrowDownEvent.preventDefault).toHaveBeenCalled();
      expect(navigateSuggestionsSpy).toHaveBeenCalledWith(1);

      const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      Object.defineProperty(arrowUpEvent, 'preventDefault', { value: jest.fn() });

      component['handleKeyDown'](arrowUpEvent);

      expect(arrowUpEvent.preventDefault).toHaveBeenCalled();
      expect(navigateSuggestionsSpy).toHaveBeenCalledWith(-1);
    });

    it('should select suggestion with Enter key', () => {
      component['state'].showSuggestions = true;
      component['state'].selectedSuggestionIndex = 1;

      const selectSuggestionSpy = jest.spyOn(component as any, 'selectSuggestion');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      Object.defineProperty(enterEvent, 'preventDefault', { value: jest.fn() });

      component['handleKeyDown'](enterEvent);

      expect(enterEvent.preventDefault).toHaveBeenCalled();
      expect(selectSuggestionSpy).toHaveBeenCalledWith(1);
    });

    it('should hide suggestions with Escape key', () => {
      component['state'].showSuggestions = true;

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });

      component['handleKeyDown'](escapeEvent);

      expect(component['state'].showSuggestions).toBe(false);
    });
  });

  describe('File Attachment', () => {
    it('should handle file attachment', () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      component['props'].onAttachment = jest.fn();

      // Mock file input
      const mockInput = {
        type: 'file',
        accept: 'image/*,.pdf,.doc,.docx,.txt',
        multiple: true,
        files: [mockFile],
        click: jest.fn(),
      };

      // Mock document.createElement
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockReturnValue(mockInput);

      component['handleFileAttachment']();

      expect(mockInput.click).toHaveBeenCalled();
      expect(component['props'].onAttachment).toHaveBeenCalledWith(mockFile);

      // Restore original createElement
      document.createElement = originalCreateElement;
    });

    it('should handle multiple file attachments', () => {
      const mockFiles = [
        new File(['test1'], 'test1.txt', { type: 'text/plain' }),
        new File(['test2'], 'test2.txt', { type: 'text/plain' }),
      ];
      component['props'].onAttachment = jest.fn();

      // Mock file input
      const mockInput = {
        type: 'file',
        accept: 'image/*,.pdf,.doc,.docx,.txt',
        multiple: true,
        files: mockFiles,
        click: jest.fn(),
      };

      // Mock document.createElement
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockReturnValue(mockInput);

      component['handleFileAttachment']();

      expect(component['props'].onAttachment).toHaveBeenCalledTimes(2);
      expect(component['props'].onAttachment).toHaveBeenCalledWith(mockFiles[0]);
      expect(component['props'].onAttachment).toHaveBeenCalledWith(mockFiles[1]);

      // Restore original createElement
      document.createElement = originalCreateElement;
    });
  });

  describe('Voice Recording', () => {
    beforeEach(() => {
      component['recognition'] = {
        start: jest.fn(),
        stop: jest.fn(),
      } as any;
    });

    it('should start voice recording', () => {
      component['state'].isRecording = false;

      component['toggleVoiceRecording']();

      expect(component['recognition'].start).toHaveBeenCalled();
      expect(component['state'].isRecording).toBe(true);
    });

    it('should stop voice recording', () => {
      component['state'].isRecording = true;

      component['toggleVoiceRecording']();

      expect(component['recognition'].stop).toHaveBeenCalled();
      expect(component['state'].isRecording).toBe(false);
    });

    it('should handle speech recognition errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Remove recognition to simulate unsupported browser
      component['recognition'] = null;

      component['toggleVoiceRecording']();

      expect(consoleSpy).not.toHaveBeenCalled(); // Should show alert instead

      consoleSpy.mockRestore();
    });

    it('should handle speech recognition results', () => {
      const transcript = 'Hello from voice';

      // Simulate recognition result event
      const mockEvent = {
        results: [
          [{ transcript }]
        ]
      };

      if (component['recognition']) {
        component['recognition'].onresult = component['recognition'].onresult || jest.fn();
        component['recognition'].onresult(mockEvent);
      }

      expect(component['state'].content).toBe(transcript);
    });
  });

  describe('Quick Replies', () => {
    beforeEach(() => {
      // Mock shadow root
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should insert quick reply text', () => {
      component['insertQuickReply']('Student Info');

      expect(component['state'].content).toBe('Show me student information for ');
    });

    it('should focus textarea after inserting quick reply', () => {
      component['textarea'] = { focus: jest.fn() } as any;

      component['insertQuickReply']('Driver Details');

      expect(component['textarea'].focus).toHaveBeenCalled();
    });

    it('should handle unknown quick reply', () => {
      component['insertQuickReply']('Unknown');

      // Should not crash or throw error
      expect(component['state'].content).toBe('');
    });
  });

  describe('UI State', () => {
    it('should set disabled state', () => {
      component.setDisabled(true);

      expect(component['props'].disabled).toBe(true);
    });

    it('should focus input element', () => {
      component['textarea'] = { focus: jest.fn() } as any;

      component.focus();

      expect(component['textarea'].focus).toHaveBeenCalled();
    });

    it('should handle focus without textarea', () => {
      component['textarea'] = null;

      expect(() => {
        component.focus();
      }).not.toThrow();
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      // Mock shadow root
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should render basic input structure', () => {
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('chat-input-container');
      expect(shadowRoot.innerHTML).toContain('input-wrapper');
      expect(shadowRoot.innerHTML).toContain('message-input');
    });

    it('should render send button when enabled', () => {
      component['props'].showSendButton = true;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('send-btn');
      expect(shadowRoot.innerHTML).toContain('icon-send');
    });

    it('should not render send button when disabled', () => {
      component['props'].showSendButton = false;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).not.toContain('send-btn');
    });

    it('should render attachment button when enabled', () => {
      component['props'].showAttachmentButton = true;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('attachment-btn');
      expect(shadowRoot.innerHTML).toContain('icon-paperclip');
    });

    it('should render voice button when enabled', () => {
      component['props'].showVoiceButton = true;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('voice-btn');
      expect(shadowRoot.innerHTML).toContain('icon-mic');
    });

    it('should render typing indicator when typing', () => {
      component['state'].isTyping = true;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('typing-indicator');
      expect(shadowRoot.innerHTML).toContain('Typing');
    });

    it('should render recording indicator when recording', () => {
      component['state'].isRecording = true;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('recording-indicator');
      expect(shadowRoot.innerHTML).toContain('Recording...');
    });

    it('should render character count when maxLength is set', () => {
      component['props'].maxLength = 500;
      component['state'].content = 'Hello';
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('character-count');
      expect(shadowRoot.innerHTML).toContain('5/500');
    });

    it('should render suggestions when visible', () => {
      component['state'].showSuggestions = true;
      component['state'].suggestions = ['Suggestion 1', 'Suggestion 2'];
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('suggestions-dropdown');
      expect(shadowRoot.innerHTML).toContain('Suggestion 1');
      expect(shadowRoot.innerHTML).toContain('Suggestion 2');
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      // Mock shadow root with event listeners
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(),
        addEventListener: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });

      component['textarea'] = {
        value: '',
        addEventListener: jest.fn(),
      } as any;
    });

    it('should set up event listeners correctly', () => {
      component['setupEventListeners']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle send button click', () => {
      const mockSendBtn = {
        addEventListener: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValueOnce(null) // attachment-btn
        .mockReturnValueOnce(null) // voice-btn
        .mockReturnValueOnce(mockSendBtn); // send-btn

      const sendMessageSpy = jest.spyOn(component as any, 'sendMessage');

      component['setupEventListeners']();

      // Simulate click on send button
      const clickHandler = mockSendBtn.addEventListener.mock.calls[0][1];
      clickHandler();

      expect(sendMessageSpy).toHaveBeenCalled();
    });

    it('should handle attachment button click', () => {
      const mockAttachmentBtn = {
        addEventListener: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValueOnce(mockAttachmentBtn) // attachment-btn
        .mockReturnValueOnce(null) // voice-btn
        .mockReturnValueOnce(null); // send-btn

      const handleFileAttachmentSpy = jest.spyOn(component as any, 'handleFileAttachment');

      component['setupEventListeners']();

      // Simulate click on attachment button
      const clickHandler = mockAttachmentBtn.addEventListener.mock.calls[0][1];
      clickHandler();

      expect(handleFileAttachmentSpy).toHaveBeenCalled();
    });

    it('should handle voice button click', () => {
      const mockVoiceBtn = {
        addEventListener: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValueOnce(null) // attachment-btn
        .mockReturnValueOnce(mockVoiceBtn) // voice-btn
        .mockReturnValueOnce(null); // send-btn

      const toggleVoiceRecordingSpy = jest.spyOn(component as any, 'toggleVoiceRecording');

      component['setupEventListeners']();

      // Simulate click on voice button
      const clickHandler = mockVoiceBtn.addEventListener.mock.calls[0][1];
      clickHandler();

      expect(toggleVoiceRecordingSpy).toHaveBeenCalled();
    });

    it('should handle quick reply button clicks', () => {
      const mockButtons = [
        { addEventListener: jest.fn(), dataset: { reply: 'Student Info' } },
        { addEventListener: jest.fn(), dataset: { reply: 'Driver Details' } },
      ];

      component['shadowRoot']!.querySelectorAll = jest.fn()
        .mockReturnValueOnce(mockButtons) // quick-reply-btn
        .mockReturnValueOnce([]); // suggestion-item

      const insertQuickReplySpy = jest.spyOn(component as any, 'insertQuickReply');

      component['setupEventListeners']();

      // Simulate clicks on quick reply buttons
      mockButtons.forEach((btn, index) => {
        const clickHandler = btn.addEventListener.mock.calls[0][1];
        clickHandler({ target: btn });
      });

      expect(insertQuickReplySpy).toHaveBeenCalledWith('Student Info');
      expect(insertQuickReplySpy).toHaveBeenCalledWith('Driver Details');
    });

    it('should handle suggestion item clicks', () => {
      const mockSuggestionItems = [
        { addEventListener: jest.fn(), dataset: { index: '0' } },
        { addEventListener: jest.fn(), dataset: { index: '1' } },
      ];

      component['shadowRoot']!.querySelectorAll = jest.fn()
        .mockReturnValueOnce([]) // quick-reply-btn
        .mockReturnValueOnce(mockSuggestionItems); // suggestion-item

      const selectSuggestionSpy = jest.spyOn(component as any, 'selectSuggestion');

      component['setupEventListeners']();

      // Simulate clicks on suggestion items
      mockSuggestionItems.forEach((item, index) => {
        const clickHandler = item.addEventListener.mock.calls.find(call => call[0] === 'click')?.[1];
        if (clickHandler) {
          clickHandler({ target: item });
        }
      });

      expect(selectSuggestionSpy).toHaveBeenCalledWith(0);
      expect(selectSuggestionSpy).toHaveBeenCalledWith(1);
    });

    it('should handle suggestion item mouseenter', () => {
      const mockSuggestionItems = [
        { addEventListener: jest.fn(), dataset: { index: '0' } },
      ];

      component['shadowRoot']!.querySelectorAll = jest.fn()
        .mockReturnValueOnce([]) // quick-reply-btn
        .mockReturnValueOnce(mockSuggestionItems); // suggestion-item

      component['setupEventListeners']();

      // Simulate mouseenter on suggestion item
      const mouseenterHandler = mockSuggestionItems[0].addEventListener.mock.calls.find(
        call => call[0] === 'mouseenter'
      )?.[1];

      if (mouseenterHandler) {
        mouseenterHandler({ target: mockSuggestionItems[0] });
      }

      expect(component['state'].selectedSuggestionIndex).toBe(0);
    });

    it('should handle stop recording button click', () => {
      const mockStopBtn = {
        addEventListener: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValue(mockStopBtn); // stop-recording-btn

      component['recognition'] = { stop: jest.fn() } as any;
      component['state'].isRecording = true;

      component['setupEventListeners']();

      // Simulate click on stop recording button
      const clickHandler = mockStopBtn.addEventListener.mock.calls[0][1];
      clickHandler();

      expect(component['recognition'].stop).toHaveBeenCalled();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up on disconnection', () => {
      component['typingTimer'] = 12345 as any;
      component['recognition'] = { stop: jest.fn() } as any;
      component['state'].isRecording = true;

      component.disconnectedCallback();

      expect(component['typingTimer']).toBeNull();
      expect(component['recognition'].stop).toHaveBeenCalled();
    });

    it('should handle cleanup without active recording', () => {
      component['typingTimer'] = null;
      component['recognition'] = null;
      component['state'].isRecording = false;

      expect(() => {
        component.disconnectedCallback();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing callback functions', () => {
      component['props'].onSend = undefined;
      component['props'].onTyping = undefined;
      component['props'].onAttachment = undefined;

      expect(() => {
        component['sendMessage']();
        component['handleTypingChange'](true);
        component['handleFileAttachment']();
      }).not.toThrow();
    });

    it('should handle malformed keyboard events', () => {
      expect(() => {
        component['handleKeyDown']({} as KeyboardEvent);
        component['handleKeyDown'](null as any);
      }).not.toThrow();
    });

    it('should handle component without shadow root', () => {
      Object.defineProperty(component, 'shadowRoot', {
        value: null,
        writable: true,
      });

      expect(() => {
        component['render']();
        component['setupEventListeners']();
      }).not.toThrow();
    });

    it('should handle resize events', () => {
      component['textarea'] = {
        style: { height: 'auto' },
        scrollHeight: 40,
      } as any;

      const adjustTextareaHeightSpy = jest.spyOn(component as any, 'adjustTextareaHeight');

      // Simulate window resize
      window.dispatchEvent(new Event('resize'));

      // The resize handler should be set up in setupEventListeners
      expect(adjustTextareaHeightSpy).toHaveBeenCalled();
    });
  });
});