import * as vscode from 'vscode';
import * as http from 'http';

let mcpOutputChannel: vscode.OutputChannel;
let chatPanel: vscode.WebviewPanel | undefined;
let currentConversationId: string | undefined;

interface ExtensionConfig {
  mcpServerUrl: string;
  backendApiUrl: string;
  enableDebugMode: boolean;
  maxSearchResults: number;
}

let extensionConfig: ExtensionConfig = {
  mcpServerUrl: 'http://localhost:3001',
  backendApiUrl: 'http://localhost:8000',
  enableDebugMode: false,
  maxSearchResults: 50,
};

interface MCPToolResponse {
  result: {
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  };
}

function callMCPTool(toolName: string, args: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      params: {
        name: toolName,
        arguments: args
      }
    });

    const mcpUrl = new URL(extensionConfig.mcpServerUrl);
    const options = {
      hostname: mcpUrl.hostname,
      port: parseInt(mcpUrl.port || '80'),
      path: '/tools/call',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response: MCPToolResponse = JSON.parse(data);
          if (response.result.isError) {
            reject(new Error(response.result.content[0].text));
          } else {
            resolve(response.result.content[0].text);
          }
        } catch (error) {
          reject(new Error('Failed to parse MCP response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`MCP server connection failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

function createChatConversation(): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({});

    const backendUrl = new URL(extensionConfig.backendApiUrl);
    const options = {
      hostname: backendUrl.hostname,
      port: parseInt(backendUrl.port || '80'),
      path: '/api/chat/conversation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response.id);
          } else {
            reject(new Error(`Failed to create conversation: ${response.detail || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error('Failed to parse chat response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Chat service connection failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

function sendChatMessage(conversationId: string, message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      conversation_id: conversationId,
      content: message,
      message_type: "user"
    });

    const backendUrl = new URL(extensionConfig.backendApiUrl);
    const options = {
      hostname: backendUrl.hostname,
      port: parseInt(backendUrl.port || '80'),
      path: '/api/chat/message',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response.ai_response);
          } else {
            reject(new Error(`Failed to send message: ${response.detail || 'Unknown error'}`));
          }
        } catch (error) {
          reject(new Error('Failed to parse chat response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Chat service connection failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

function createChatPanel(context: vscode.ExtensionContext) {
  if (chatPanel) {
    chatPanel.reveal(vscode.ViewColumn.One);
    return;
  }

  chatPanel = vscode.window.createWebviewPanel(
    'aiChat',
    'AI Chat Assistant',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  chatPanel.webview.html = getChatHtml();

  // Handle messages from the webview
  chatPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.type) {
        case 'sendMessage':
          await handleChatMessage(message.text);
          break;
        case 'newConversation':
          await startNewConversation();
          break;
      }
    },
    undefined,
    context.subscriptions
  );

  chatPanel.onDidDispose(
    () => {
      chatPanel = undefined;
      currentConversationId = undefined;
    },
    null,
    context.subscriptions
  );
}

function getChatHtml(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chat Assistant</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        .message {
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 6px;
            max-width: 80%;
        }
        .message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            align-self: flex-end;
            margin-left: auto;
        }
        .message.assistant {
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
        }
        .input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 10px;
        }
        .message-input {
            flex: 1;
            padding: 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        .send-button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .send-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .new-conversation-button {
            padding: 4px 8px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .new-conversation-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .loading {
            display: none;
            text-align: center;
            padding: 10px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>AI Chat Assistant</h2>
        <button class="new-conversation-button" onclick="newConversation()">New Chat</button>
    </div>
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                Hello! I'm your AI assistant. I can help you with information about students, drivers, routes, and fees. I also have access to development tools for code search, documentation search, and testing. What would you like to know?
            </div>
        </div>
        <div class="loading" id="loading">AI is thinking...</div>
        <div class="input-container">
            <input type="text" class="message-input" id="messageInput" placeholder="Type your message..." onkeydown="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const loadingDiv = document.getElementById('loading');

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            messageInput.value = '';
            loadingDiv.style.display = 'block';

            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });
        }

        function newConversation() {
            messagesDiv.innerHTML = '<div class="message assistant">Hello! I\\'m your AI assistant. I can help you with information about students, drivers, routes, and fees. I also have access to development tools for code search, documentation search, and testing. What would you like to know?</div>';
            vscode.postMessage({
                type: 'newConversation'
            });
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'assistantResponse':
                    loadingDiv.style.display = 'none';
                    addMessage(message.text, 'assistant');
                    break;
                case 'error':
                    loadingDiv.style.display = 'none';
                    addMessage('Sorry, I encountered an error: ' + message.text, 'assistant');
                    break;
            }
        });

        function addMessage(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${sender}\`;
            messageDiv.textContent = text;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    </script>
</body>
</html>`;
}

async function handleChatMessage(message: string) {
  if (!chatPanel) return;

  try {
    // Ensure we have a conversation
    if (!currentConversationId) {
      await startNewConversation();
    }

    if (!currentConversationId) {
      chatPanel.webview.postMessage({
        type: 'error',
        text: 'Failed to create conversation'
      });
      return;
    }

    // Send message to backend
    const response = await sendChatMessage(currentConversationId, message);

    // Send response back to webview
    chatPanel.webview.postMessage({
      type: 'assistantResponse',
      text: response
    });
  } catch (error) {
    chatPanel.webview.postMessage({
      type: 'error',
      text: (error as Error).message
    });
  }
}

async function startNewConversation() {
  try {
    currentConversationId = await createChatConversation();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create conversation: ${(error as Error).message}`);
  }
}

async function codeSearch() {
  const query = await vscode.window.showInputBox({
    prompt: 'Enter regex pattern to search for',
    placeHolder: 'e.g., function.*test'
  });

  if (!query) return;

  const path = await vscode.window.showInputBox({
    prompt: 'Enter directory to search in (relative to workspace)',
    placeHolder: '.'
  }) || '.';

  const filePattern = await vscode.window.showInputBox({
    prompt: 'Enter file pattern (e.g., *.ts)',
    placeHolder: '*'
  }) || '*';

  try {
    const result = await callMCPTool('code_search', { query, path, filePattern });
    mcpOutputChannel.appendLine(`Code Search Results for "${query}":`);
    mcpOutputChannel.appendLine(result);
    mcpOutputChannel.show();
  } catch (error) {
    vscode.window.showErrorMessage(`Code search failed: ${(error as Error).message}`);
  }
}

async function docSearch() {
  const query = await vscode.window.showInputBox({
    prompt: 'Enter text to search for in documentation',
    placeHolder: 'e.g., authentication'
  });

  if (!query) return;

  try {
    const result = await callMCPTool('doc_search', { query });
    mcpOutputChannel.appendLine(`Documentation Search Results for "${query}":`);
    mcpOutputChannel.appendLine(result);
    mcpOutputChannel.show();
  } catch (error) {
    vscode.window.showErrorMessage(`Documentation search failed: ${(error as Error).message}`);
  }
}

async function runTests() {
  const testPattern = await vscode.window.showInputBox({
    prompt: 'Enter test pattern (optional)',
    placeHolder: 'leave empty for all tests'
  });

  const args: any = {};
  if (testPattern) {
    args.testPattern = testPattern;
  }

  try {
    const result = await callMCPTool('run_tests', args);
    mcpOutputChannel.appendLine('Test Run Results:');
    mcpOutputChannel.appendLine(result);
    mcpOutputChannel.show();
  } catch (error) {
    vscode.window.showErrorMessage(`Test run failed: ${(error as Error).message}`);
  }
}

function openChat(context: vscode.ExtensionContext) {
  createChatPanel(context);
}

export function activate(context: vscode.ExtensionContext) {
  console.log('MCP Integration Extension is now active!');

  // Load configuration
  const config = vscode.workspace.getConfiguration('myVscodeExtension');
  extensionConfig = {
    mcpServerUrl: config.get('mcpServerUrl', extensionConfig.mcpServerUrl),
    backendApiUrl: config.get('backendApiUrl', extensionConfig.backendApiUrl),
    enableDebugMode: config.get('enableDebugMode', extensionConfig.enableDebugMode),
    maxSearchResults: config.get('maxSearchResults', extensionConfig.maxSearchResults),
  };

  if (extensionConfig.enableDebugMode) {
    console.log('Extension configuration loaded:', extensionConfig);
  }

  mcpOutputChannel = vscode.window.createOutputChannel('MCP Tools');

  // Register MCP commands
  let codeSearchCmd = vscode.commands.registerCommand('extension.mcpCodeSearch', codeSearch);
  let docSearchCmd = vscode.commands.registerCommand('extension.mcpDocSearch', docSearch);
  let runTestsCmd = vscode.commands.registerCommand('extension.mcpRunTests', runTests);
  let openChatCmd = vscode.commands.registerCommand('extension.openChat', () => openChat(context));

  context.subscriptions.push(codeSearchCmd);
  context.subscriptions.push(docSearchCmd);
  context.subscriptions.push(runTestsCmd);
  context.subscriptions.push(openChatCmd);
  context.subscriptions.push(mcpOutputChannel);
}

export function deactivate() {}