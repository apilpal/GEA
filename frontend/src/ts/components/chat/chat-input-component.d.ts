import { BaseComponent } from '@/ts/components/core/base-component';
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
interface ChatInputState {
    content: string;
    isTyping: boolean;
    isRecording: boolean;
    showSuggestions: boolean;
    suggestions: string[];
    selectedSuggestionIndex: number;
}
declare class ChatInputComponent extends BaseComponent {
    private props;
    private state;
    private textarea;
    private typingTimer;
    private recognition;
    private readonly COMMON_SUGGESTIONS;
    private readonly QUICK_REPLIES;
    constructor(props: ChatInputProps);
    private initializeSpeechRecognition;
    private insertText;
    private updateContent;
    private updateSuggestions;
    private handleTypingChange;
    private adjustTextareaHeight;
    private handleKeyDown;
    private navigateSuggestions;
    private selectSuggestion;
    private sendMessage;
    private handleFileAttachment;
    private toggleVoiceRecording;
    private insertQuickReply;
    protected render(): void;
    private renderQuickReplies;
    private renderSuggestions;
    protected setupEventListeners(): void;
    setContent(content: string): void;
    getContent(): string;
    focus(): void;
    setDisabled(disabled: boolean): void;
    clear(): void;
    disconnectedCallback(): void;
}
export { ChatInputComponent };
export type { ChatInputProps, ChatInputState };
//# sourceMappingURL=chat-input-component.d.ts.map