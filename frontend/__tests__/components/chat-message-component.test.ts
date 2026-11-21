/// <reference types="jest" />
// Chat Message Component Tests
import { ChatMessageComponent } from '../../src/ts/components/chat/chat-message-component';

describe('ChatMessageComponent', () => {
  let component: ChatMessageComponent;
  let mockElement: HTMLElement;
  const mockMessage = {
    id: 'msg-1',
    conversation_id: 'conv-1',
    message_type: 'user' as const,
    content: 'Hello, this is a test message with https://example.com and email@test.com',
    created_at: Date.now(),
    status: 'sent' as const,
  };

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    // Create component instance
    component = new ChatMessageComponent({
      message: mockMessage,
      showAvatar: true,
      showTimestamp: true,
      showStatus: true,
      compact: false,
    });

    // Create mock element
    mockElement = document.createElement('div');
    mockElement.id = 'chat-message';
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    // Cleanup
    if (component && document.body.contains(mockElement)) {
      document.body.removeChild(mockElement);
    }
  });

  describe('Initialization', () => {
    it('should initialize with provided props', () => {
      expect(component).toBeInstanceOf(ChatMessageComponent);
      expect(component['props'].message).toEqual(mockMessage);
      expect(component['isEditing']).toBe(false);
      expect(component['editContent']).toBe(mockMessage.content);
    });

    it('should initialize with default props when not provided', () => {
      const minimalComponent = new ChatMessageComponent({
        message: mockMessage,
      });

      expect(minimalComponent['props'].showAvatar).toBe(true);
      expect(minimalComponent['props'].showTimestamp).toBe(true);
      expect(minimalComponent['props'].showStatus).toBe(true);
      expect(minimalComponent['props'].compact).toBe(false);
    });

    it('should update props correctly', () => {
      const newProps = {
        showAvatar: false,
        compact: true,
      };

      component.updateProps(newProps);

      expect(component['props'].showAvatar).toBe(false);
      expect(component['props'].compact).toBe(true);
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      // Mock shadow root
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

    it('should render user message correctly', () => {
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('user-message');
      expect(shadowRoot.innerHTML).toContain('icon-user');
      expect(shadowRoot.innerHTML).toContain('Hello, this is a test message');
      expect(shadowRoot.innerHTML).toContain('message-time');
    });

    it('should render assistant message correctly', () => {
      component['props'].message.message_type = 'assistant';
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('assistant-message');
      expect(shadowRoot.innerHTML).toContain('icon-bot');
    });

    it('should render system message correctly', () => {
      component['props'].message.message_type = 'system';
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('assistant-message'); // System uses assistant styling
      expect(shadowRoot.innerHTML).toContain('icon-info');
    });

    it('should render failed message with retry option', () => {
      component['props'].message.status = 'failed';
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('failed');
    });

    it('should render edit mode correctly', () => {
      component['isEditing'] = true;
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('editing');
      expect(shadowRoot.innerHTML).toContain('edit-input');
      expect(shadowRoot.innerHTML).toContain('save-edit-btn');
      expect(shadowRoot.innerHTML).toContain('cancel-edit-btn');
    });

    it('should render message actions for user messages', () => {
      component['props'].message.message_type = 'user';
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).toContain('message-actions');
      expect(shadowRoot.innerHTML).toContain('edit-btn');
      expect(shadowRoot.innerHTML).toContain('delete-btn');
    });

    it('should not render message actions for system messages', () => {
      component['props'].message.message_type = 'system';
      component['render']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.innerHTML).not.toContain('message-actions');
    });

    it('should render status icons correctly', () => {
      component['props'].message.message_type = 'user';
      component['props'].message.status = 'sending';
      component['render']();

      expect(component['render']()).toContain('icon-clock');
      expect(component['render']()).toContain('status-sending');

      component['props'].message.status = 'sent';
      expect(component['render']()).toContain('icon-check');
      expect(component['render']()).toContain('status-sent');

      component['props'].message.status = 'delivered';
      expect(component['render']()).toContain('icon-check-all');
      expect(component['render']()).toContain('status-delivered');

      component['props'].message.status = 'read';
      expect(component['render']()).toContain('icon-check-all');
      expect(component['render']()).toContain('status-read');

      component['props'].message.status = 'failed';
      expect(component['render']()).toContain('icon-alert-circle');
      expect(component['render']()).toContain('status-failed');
    });
  });

  describe('Content Formatting', () => {
    it('should format URLs correctly', () => {
      const content = 'Check out https://example.com for more info';
      const formatted = component['formatMessageContent'](content);

      expect(formatted).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>');
    });

    it('should format email addresses correctly', () => {
      const content = 'Contact us at support@example.com';
      const formatted = component['formatMessageContent'](content);

      expect(formatted).toContain('<a href="mailto:support@example.com">support@example.com</a>');
    });

    it('should format phone numbers correctly', () => {
      const content = 'Call us at +1-234-567-8900';
      const formatted = component['formatMessageContent'](content);

      expect(formatted).toContain('<a href="tel:+1-234-567-8900">+1-234-567-8900</a>');
    });

    it('should preserve line breaks', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const formatted = component['formatMessageContent'](content);

      expect(formatted).toContain('Line 1<br>Line 2<br>Line 3');
    });

    it('should handle complex content with multiple formats', () => {
      const content = 'Visit https://example.com, email support@example.com, or call +1-234-567-8900';
      const formatted = component['formatMessageContent'](content);

      expect(formatted).toContain('<a href="https://example.com"');
      expect(formatted).toContain('<a href="mailto:support@example.com"');
      expect(formatted).toContain('<a href="tel:+1-234-567-8900"');
    });
  });

  describe('Edit Functionality', () => {
    beforeEach(() => {
      // Mock shadow root for edit operations
      const mockShadowRoot = {
        innerHTML: '',
        querySelector: jest.fn(),
      };

      Object.defineProperty(component, 'shadowRoot', {
        value: mockShadowRoot,
        writable: true,
      });
    });

    it('should start editing mode', () => {
      component['startEditing']();

      expect(component['isEditing']).toBe(true);
    });

    it('should cancel editing mode', () => {
      component['isEditing'] = true;
      component['editContent'] = 'Modified content';

      component['cancelEdit']();

      expect(component['isEditing']).toBe(false);
      expect(component['editContent']).toBe(mockMessage.content);
    });

    it('should save edit with valid content', () => {
      const mockOnEdit = jest.fn();
      component['props'].onEdit = mockOnEdit;

      component['isEditing'] = true;
      component['editContent'] = 'Updated message content';

      component['saveEdit']();

      expect(mockOnEdit).toHaveBeenCalledWith(mockMessage.id, 'Updated message content');
      expect(component['isEditing']).toBe(false);
    });

    it('should not save edit with empty content', () => {
      const mockOnEdit = jest.fn();
      component['props'].onEdit = mockOnEdit;

      component['isEditing'] = true;
      component['editContent'] = '   ';

      component['saveEdit']();

      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(component['isEditing']).toBe(false);
    });

    it('should not save edit with unchanged content', () => {
      const mockOnEdit = jest.fn();
      component['props'].onEdit = mockOnEdit;

      component['isEditing'] = true;
      component['editContent'] = mockMessage.content; // Same as original

      component['saveEdit']();

      expect(mockOnEdit).not.toHaveBeenCalled();
      expect(component['isEditing']).toBe(false);
    });

    it('should handle delete confirmation', () => {
      const mockOnDelete = jest.fn();
      component['props'].onDelete = mockOnDelete;

      // Mock window.confirm
      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(true);

      component['handleDelete']();

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this message?');
      expect(mockOnDelete).toHaveBeenCalledWith(mockMessage.id);

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should not delete when confirmation is cancelled', () => {
      const mockOnDelete = jest.fn();
      component['props'].onDelete = mockOnDelete;

      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = jest.fn().mockReturnValue(false);

      component['handleDelete']();

      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this message?');
      expect(mockOnDelete).not.toHaveBeenCalled();

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it('should handle retry for failed messages', () => {
      const mockOnRetry = jest.fn();
      component['props'].onRetry = mockOnRetry;
      component['props'].message.status = 'failed';

      component['handleRetry']();

      expect(mockOnRetry).toHaveBeenCalledWith(mockMessage.id);
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
    });

    it('should set up event listeners correctly', () => {
      component['setupEventListeners']();

      const shadowRoot = component['shadowRoot'];
      expect(shadowRoot.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should handle edit button click', () => {
      const mockEditBtn = {
        addEventListener: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValueOnce(mockEditBtn) // edit-btn
        .mockReturnValueOnce(null) // delete-btn
        .mockReturnValueOnce(null) // retry-btn
        .mockReturnValueOnce(null) // save-edit-btn
        .mockReturnValueOnce(null); // cancel-edit-btn

      const startEditingSpy = jest.spyOn(component as any, 'startEditing');

      component['setupEventListeners']();

      // Simulate click on edit button
      const editClickHandler = mockEditBtn.addEventListener.mock.calls[0][1];
      editClickHandler();

      expect(startEditingSpy).toHaveBeenCalled();
    });

    it('should handle delete button click', () => {
      const mockDeleteBtn = {
        addEventListener: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValueOnce(null) // edit-btn
        .mockReturnValueOnce(mockDeleteBtn) // delete-btn
        .mockReturnValueOnce(null) // retry-btn
        .mockReturnValueOnce(null) // save-edit-btn
        .mockReturnValueOnce(null); // cancel-edit-btn

      const handleDeleteSpy = jest.spyOn(component as any, 'handleDelete');

      component['setupEventListeners']();

      // Simulate click on delete button
      const deleteClickHandler = mockDeleteBtn.addEventListener.mock.calls[0][1];
      deleteClickHandler();

      expect(handleDeleteSpy).toHaveBeenCalled();
    });

    it('should handle keyboard shortcuts in edit mode', () => {
      const mockEditInput = {
        addEventListener: jest.fn(),
        focus: jest.fn(),
        select: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValueOnce(null) // edit-btn
        .mockReturnValueOnce(null) // delete-btn
        .mockReturnValueOnce(null) // retry-btn
        .mockReturnValueOnce(null) // save-edit-btn
        .mockReturnValueOnce(null) // cancel-edit-btn
        .mockReturnValueOnce(mockEditInput); // edit-input

      component['isEditing'] = true;
      component['setupEventListeners']();

      // Test Ctrl+Enter to save
      const ctrlEnterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
      });
      Object.defineProperty(ctrlEnterEvent, 'preventDefault', { value: jest.fn() });

      const saveEditSpy = jest.spyOn(component as any, 'saveEdit');

      const keydownHandler = mockEditInput.addEventListener.mock.calls.find(
        call => call[0] === 'keydown'
      )?.[1];

      if (keydownHandler) {
        keydownHandler(ctrlEnterEvent);
      }

      expect(saveEditSpy).toHaveBeenCalled();

      // Test Escape to cancel
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      Object.defineProperty(escapeEvent, 'preventDefault', { value: jest.fn() });

      const cancelEditSpy = jest.spyOn(component as any, 'cancelEdit');

      if (keydownHandler) {
        keydownHandler(escapeEvent);
      }

      expect(cancelEditSpy).toHaveBeenCalled();
    });

    it('should adjust edit textarea height', () => {
      const mockTextarea = {
        style: { height: 'auto' },
        scrollHeight: 100,
      };

      component['adjustEditTextareaHeight'](mockTextarea as any);

      expect(mockTextarea.style.height).toBe('auto');
      expect(mockTextarea.style.height).toBe('100px');
    });
  });

  describe('State Management', () => {
    it('should update status correctly', () => {
      component.updateStatus('delivered');

      expect(component['props'].message.status).toBe('delivered');
    });

    it('should update content correctly', () => {
      const newContent = 'Updated message content';

      component.updateContent(newContent);

      expect(component['props'].message.content).toBe(newContent);
      expect(component['editContent']).toBe(newContent);
    });

    it('should update content without affecting edit state when editing', () => {
      component['isEditing'] = true;
      component['editContent'] = 'Different edit content';

      const newContent = 'Updated message content';

      component.updateContent(newContent);

      expect(component['props'].message.content).toBe(newContent);
      expect(component['editContent']).toBe('Different edit content'); // Should not change
    });

    it('should get current message data', () => {
      const message = component.getMessage();

      expect(message).toEqual(mockMessage);
    });

    it('should focus on message element', () => {
      const mockMessageWrapper = {
        focus: jest.fn(),
      };

      component['shadowRoot']!.querySelector = jest.fn()
        .mockReturnValue(mockMessageWrapper);

      component.focus();

      expect(component['shadowRoot']!.querySelector).toHaveBeenCalledWith('.message-wrapper');
      expect(mockMessageWrapper.focus).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing message ID gracefully', () => {
      component['props'].message.id = undefined;

      expect(() => {
        component['saveEdit']();
      }).not.toThrow();
    });

    it('should handle missing callback functions', () => {
      component['props'].onEdit = undefined;
      component['props'].onDelete = undefined;
      component['props'].onRetry = undefined;

      expect(() => {
        component['saveEdit']();
        component['handleDelete']();
        component['handleRetry']();
      }).not.toThrow();
    });

    it('should handle malformed content in formatting', () => {
      expect(() => {
        component['formatMessageContent']('');
        component['formatMessageContent'](null as any);
        component['formatMessageContent'](undefined as any);
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
        component.focus();
      }).not.toThrow();
    });
  });
});