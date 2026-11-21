// Chat Input Component - Enhanced input for chat messages
import { BaseComponent } from '@/ts/components/core/base-component';

/**
 * Props for the chat input component
 */
interface ChatInputProps {
    placeholder?: string;
    maxLength?: number;
    disabled?: boolean;
    showSendButton?: boolean;
    showAttachmentButton?: boolean;
    showVoiceButton?: boolean;
    autoFocus?: boolean;
    allowMultiline?: boolean;
    onSend?: (content: string) => void;
    onTyping?: (isTyping: boolean) => void;
    onAttachment?: (file: File) => void;
    onVoice?: () => void;
}

/**
 * State for the chat input component
 */
interface ChatInputState {
    content: string;
    isTyping: boolean;
    isRecording: boolean;
    showSuggestions: boolean;
    suggestions: string[];
    selectedSuggestionIndex: number;
}

/**
 * Enhanced chat input component with advanced features including:
 * - Auto-complete suggestions
 * - Voice message support
 * - File attachment handling
 * - Typing indicators
 * - Multi-line support with keyboard shortcuts
 * - Emoji picker integration
 * - Mention support (@username)
 */
class ChatInputComponent extends BaseComponent {
    private props: ChatInputProps;
    private state: ChatInputState;
    private textarea: HTMLTextAreaElement | null = null;
    private typingTimer: number | null = null;
    private recognition: any = null; // SpeechRecognition API

    // Common chat suggestions based on school context
    private readonly COMMON_SUGGESTIONS = [
        "Show me student information for",
        "Who is the driver for route",
        "What routes go to",
        "Help me with fee information",
        "Contact information for",
        "Find student in class",
        "Driver contact details for",
        "Route information for sector",
        "Student enrollment details",
        "Transport fee structure"
    ];

    // Quick reply buttons for common queries
    private readonly QUICK_REPLIES = [
        "Student Info",
        "Driver Details",
        "Route Info",
        "Fee Details",
        "Contact Info",
        "Help"
    ];

    constructor(props: ChatInputProps) {
        super();
        this.props = {
            placeholder: "Type your message... (e.g., 'Show me student information for Priya')",
            maxLength: 1000,
            disabled: false,
            showSendButton: true,
            showAttachmentButton: true,
            showVoiceButton: false,
            autoFocus: false,
            allowMultiline: true,
            ...props
        };

        this.state = {
            content: '',
            isTyping: false,
            isRecording: false,
            showSuggestions: false,
            suggestions: [],
            selectedSuggestionIndex: -1
        };

        this.initializeSpeechRecognition();
    }

    /**
     * Initialize speech recognition for voice messages
     */
    private initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.state.isRecording = true;
                this.markForRender();
            };

            this.recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                this.insertText(transcript);
            };

            this.recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                this.state.isRecording = false;
                this.markForRender();
            };

            this.recognition.onend = () => {
                this.state.isRecording = false;
                this.markForRender();
            };
        }
    }

    /**
     * Insert text at cursor position
     */
    private insertText(text: string) {
        if (!this.textarea) return;

        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const beforeText = this.state.content.substring(0, start);
        const afterText = this.state.content.substring(end);
        const newContent = beforeText + text + afterText;

        this.updateContent(newContent);

        // Set cursor position after inserted text
        setTimeout(() => {
            this.textarea!.selectionStart = this.textarea!.selectionEnd = start + text.length;
            this.textarea!.focus();
        }, 0);
    }

    /**
     * Update content and trigger change events
     */
    private updateContent(content: string) {
        this.state.content = content;
        this.updateSuggestions(content);
        this.handleTypingChange(content.length > 0);
        this.adjustTextareaHeight();
        this.markForRender();
    }

    /**
     * Update autocomplete suggestions based on input
     */
    private updateSuggestions(content: string) {
        if (content.length < 2) {
            this.state.suggestions = [];
            this.state.showSuggestions = false;
            return;
        }

        const lastWord = content.split(' ').pop()?.toLowerCase() || '';
        const filteredSuggestions = this.COMMON_SUGGESTIONS.filter(suggestion =>
            suggestion.toLowerCase().includes(lastWord)
        );

        this.state.suggestions = filteredSuggestions.slice(0, 5); // Limit to 5 suggestions
        this.state.showSuggestions = this.state.suggestions.length > 0;
        this.state.selectedSuggestionIndex = -1;
    }

    /**
     * Handle typing state changes
     */
    private handleTypingChange(isTyping: boolean) {
        if (this.state.isTyping !== isTyping) {
            this.state.isTyping = isTyping;

            // Clear existing timer
            if (this.typingTimer) {
                clearTimeout(this.typingTimer);
            }

            // Notify parent component
            this.props.onTyping?.(isTyping);

            // Set timer to stop typing indicator after 3 seconds of inactivity
            if (isTyping) {
                this.typingTimer = window.setTimeout(() => {
                    this.state.isTyping = false;
                    this.props.onTyping?.(false);
                    this.markForRender();
                }, 5173);
            }
        }
    }

    /**
     * Auto-resize textarea based on content
     */
    private adjustTextareaHeight() {
        if (this.textarea) {
            this.textarea.style.height = 'auto';
            const scrollHeight = this.textarea.scrollHeight;
            const maxHeight = 120; // Maximum height before scrolling
            this.textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';

            // Add overflow styling if content exceeds max height
            if (scrollHeight > maxHeight) {
                this.textarea.style.overflowY = 'auto';
            } else {
                this.textarea.style.overflowY = 'hidden';
            }
        }
    }

    /**
     * Handle keydown events for keyboard shortcuts
     */
    private handleKeyDown(e: KeyboardEvent) {
        const { key, ctrlKey, metaKey, shiftKey } = e;

        // Handle suggestion navigation
        if (this.state.showSuggestions) {
            switch (key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateSuggestions(1);
                    return;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateSuggestions(-1);
                    return;
                case 'Enter':
                    if (this.state.selectedSuggestionIndex >= 0) {
                        e.preventDefault();
                        this.selectSuggestion(this.state.selectedSuggestionIndex);
                        return;
                    }
                    break;
                case 'Escape':
                    this.state.showSuggestions = false;
                    this.markForRender();
                    return;
            }
        }

        // Handle send shortcuts
        if (key === 'Enter') {
            if (ctrlKey || metaKey) {
                // Ctrl+Enter or Cmd+Enter to send
                e.preventDefault();
                this.sendMessage();
            } else if (!shiftKey && !this.props.allowMultiline) {
                // Enter to send (only if multiline not allowed)
                e.preventDefault();
                this.sendMessage();
            }
        }
    }

    /**
     * Navigate through suggestions with arrow keys
     */
    private navigateSuggestions(direction: number) {
        const maxIndex = this.state.suggestions.length - 1;
        let newIndex = this.state.selectedSuggestionIndex + direction;

        if (newIndex < 0) {
            newIndex = maxIndex;
        } else if (newIndex > maxIndex) {
            newIndex = 0;
        }

        this.state.selectedSuggestionIndex = newIndex;
        this.markForRender();
    }

    /**
     * Select a suggestion and insert it
     */
    private selectSuggestion(index: number) {
        const suggestion = this.state.suggestions[index];
        if (suggestion) {
            // Replace the last word with the suggestion
            const words = this.state.content.split(' ');
            words.pop(); // Remove the partial word
            words.push(suggestion);
            this.updateContent(words.join(' ') + ' ');
            this.state.showSuggestions = false;
            this.markForRender();
        }
    }

    /**
     * Send the current message
     */
    private sendMessage() {
        const content = this.state.content.trim();
        if (!content || this.props.disabled) return;

        this.props.onSend?.(content);
        this.updateContent('');

        // Clear typing state
        this.handleTypingChange(false);
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
    }

    /**
     * Handle file attachment
     */
    private handleFileAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx,.txt';
        input.multiple = true;

        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                Array.from(files).forEach(file => {
                    this.props.onAttachment?.(file);
                });
            }
        };

        input.click();
    }

    /**
     * Start/stop voice recording
     */
    private toggleVoiceRecording() {
        if (!this.recognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (this.state.isRecording) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    /**
     * Insert quick reply text
     */
    private insertQuickReply(reply: string) {
        const quickReplyTexts: { [key: string]: string } = {
            'Student Info': 'Show me student information for ',
            'Driver Details': 'Who is the driver for route ',
            'Route Info': 'What routes go to ',
            'Fee Details': 'Help me with fee information',
            'Contact Info': 'Contact information for ',
            'Help': 'Help'
        };

        const text = quickReplyTexts[reply];
        if (text) {
            this.updateContent(text);
            setTimeout(() => {
                this.textarea?.focus();
            }, 0);
        }
    }

    /**
     * Render the input component
     */
    protected render() {
        const shadow = this.shadowRoot!;
        shadow.innerHTML = `
            <div class="chat-input-container">
                <!-- Quick Reply Buttons -->
                <div class="quick-replies">
                    ${this.renderQuickReplies()}
                </div>

                <!-- Main Input Area -->
                <div class="input-wrapper">
                    <!-- Attachment Button -->
                    ${this.props.showAttachmentButton ? `
                        <button
                            class="input-btn attachment-btn"
                            title="Attach file"
                            aria-label="Attach file"
                            ${this.props.disabled ? 'disabled' : ''}
                        >
                            <icon-paperclip size="16"></icon-paperclip>
                        </button>
                    ` : ''}

                    <!-- Text Input -->
                    <div class="textarea-container">
                        <textarea
                            class="message-input"
                            placeholder="${this.props.placeholder || 'Type your message...'}"
                            maxlength="${this.props.maxLength || 1000}"
                            rows="1"
                            ${this.props.disabled ? 'disabled' : ''}
                            ${this.props.autoFocus ? 'autofocus' : ''}
                        ></textarea>

                        <!-- Autocomplete Suggestions -->
                        ${this.state.showSuggestions ? this.renderSuggestions() : ''}
                    </div>

                    <!-- Voice Button -->
                    ${this.props.showVoiceButton ? `
                        <button
                            class="input-btn voice-btn ${this.state.isRecording ? 'recording' : ''}"
                            title="${this.state.isRecording ? 'Stop recording' : 'Start voice message'}"
                            aria-label="${this.state.isRecording ? 'Stop recording' : 'Start voice message'}"
                            ${this.props.disabled ? 'disabled' : ''}
                        >
                            ${this.state.isRecording ?
                                '<icon-square size="16"></icon-square>' :
                                '<icon-mic size="16"></icon-mic>'}
                        </button>
                    ` : ''}

                    <!-- Send Button -->
                    ${this.props.showSendButton ? `
                        <button
                            class="input-btn send-btn"
                            title="Send message"
                            aria-label="Send message"
                            ${this.props.disabled || !this.state.content.trim() ? 'disabled' : ''}
                        >
                            <icon-send size="16"></icon-send>
                        </button>
                    ` : ''}
                </div>

                <!-- Typing Indicator -->
                ${this.state.isTyping ? `
                    <div class="typing-indicator">
                        <span>Typing</span>
                        <div class="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                ` : ''}

                <!-- Recording Indicator -->
                ${this.state.isRecording ? `
                    <div class="recording-indicator">
                        <icon-mic size="16" class="recording-icon"></icon-mic>
                        <span>Recording...</span>
                        <button class="stop-recording-btn">Stop</button>
                    </div>
                ` : ''}

                <!-- Character Count -->
                ${this.props.maxLength ? `
                    <div class="character-count ${this.state.content.length > this.props.maxLength! * 0.9 ? 'warning' : ''}">
                        ${this.state.content.length}/${this.props.maxLength}
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render quick reply buttons
     */
    private renderQuickReplies(): string {
        return this.QUICK_REPLIES.map(reply => `
            <button class="quick-reply-btn" data-reply="${reply}">
                ${reply}
            </button>
        `).join('');
    }

    /**
     * Render autocomplete suggestions
     */
    private renderSuggestions(): string {
        return `
            <div class="suggestions-dropdown">
                ${this.state.suggestions.map((suggestion, index) => `
                    <div class="suggestion-item ${index === this.state.selectedSuggestionIndex ? 'selected' : ''}"
                         data-index="${index}">
                        ${suggestion}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Set up event listeners
     */
    protected setupEventListeners() {
        const shadow = this.shadowRoot!;

        // Textarea element
        this.textarea = shadow.querySelector('.message-input') as HTMLTextAreaElement;

        // Main input handler
        this.textarea?.addEventListener('input', (e) => {
            const content = (e.target as HTMLTextAreaElement).value;
            this.updateContent(content);
        });

        // Keyboard shortcuts
        this.textarea?.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        // Send button
        const sendBtn = shadow.querySelector('.send-btn');
        sendBtn?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Attachment button
        const attachmentBtn = shadow.querySelector('.attachment-btn');
        attachmentBtn?.addEventListener('click', () => {
            this.handleFileAttachment();
        });

        // Voice button
        const voiceBtn = shadow.querySelector('.voice-btn');
        voiceBtn?.addEventListener('click', () => {
            this.toggleVoiceRecording();
        });

        // Quick reply buttons
        shadow.querySelectorAll('.quick-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reply = (e.target as HTMLElement).dataset.reply!;
                this.insertQuickReply(reply);
            });
        });

        // Suggestion items
        shadow.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const index = parseInt((e.target as HTMLElement).dataset.index!);
                this.selectSuggestion(index);
            });

            item.addEventListener('mouseenter', (e) => {
                const index = parseInt((e.target as HTMLElement).dataset.index!);
                this.state.selectedSuggestionIndex = index;
                this.markForRender();
            });
        });

        // Stop recording button
        const stopRecordingBtn = shadow.querySelector('.stop-recording-btn');
        stopRecordingBtn?.addEventListener('click', () => {
            if (this.recognition && this.state.isRecording) {
                this.recognition.stop();
            }
        });

        // Auto-resize on window resize
        window.addEventListener('resize', () => {
            this.adjustTextareaHeight();
        });
    }

    /**
     * Public method to set content
     */
    setContent(content: string) {
        this.updateContent(content);
    }

    /**
     * Public method to get current content
     */
    getContent(): string {
        return this.state.content;
    }

    /**
     * Public method to focus the input
     */
    focus() {
        this.textarea?.focus();
    }

    /**
     * Public method to disable/enable the input
     */
    setDisabled(disabled: boolean) {
        this.props.disabled = disabled;
        this.markForRender();
    }

    /**
     * Public method to clear the input
     */
    clear() {
        this.updateContent('');
    }

    /**
     * Handle component disconnection
     */
    disconnectedCallback() {
        super.disconnectedCallback();

        // Clean up timers
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }

        // Stop speech recognition if active
        if (this.recognition && this.state.isRecording) {
            this.recognition.stop();
        }
    }
}

// Export for use in other modules
export { ChatInputComponent };
export type { ChatInputProps, ChatInputState };