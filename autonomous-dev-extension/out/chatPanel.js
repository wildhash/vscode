"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatPanel = void 0;
const vscode = __importStar(require("vscode"));
class ChatPanel {
    constructor(_extensionUri, _sessionManager, _openaiService, _fileSystemService, _intentRouter, webview) {
        this._extensionUri = _extensionUri;
        this._sessionManager = _sessionManager;
        this._openaiService = _openaiService;
        this._fileSystemService = _fileSystemService;
        this._intentRouter = _intentRouter;
        this._disposables = [];
        this._isVoiceEnabled = true;
        if (webview) {
            // Using existing webview (for activity bar view)
            this._webview = webview;
        }
        else {
            // Create new panel (for standalone chat)
            this._panel = vscode.window.createWebviewPanel(ChatPanel.viewType, 'Autonomous Dev Assistant', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri, 'media'),
                    vscode.Uri.joinPath(this._extensionUri, 'out', 'media')
                ]
            });
            this._webview = this._panel.webview;
            this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        }
        this._webview.html = this._getHtmlForWebview();
        this._setWebviewMessageListener();
        // Load session history
        this._loadSessionHistory();
    }
    reveal() {
        if (this._panel) {
            this._panel.reveal();
        }
    }
    dispose() {
        if (this._panel) {
            this._panel.dispose();
        }
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    onDidDispose(callback) {
        if (this._panel) {
            this._panel.onDidDispose(callback);
        }
    }
    toggleVoice() {
        this._isVoiceEnabled = !this._isVoiceEnabled;
        this._webview.postMessage({
            type: 'toggleVoice',
            enabled: this._isVoiceEnabled
        });
        vscode.window.showInformationMessage(`Voice ${this._isVoiceEnabled ? 'enabled' : 'disabled'}`);
    }
    clearChat() {
        this._webview.postMessage({ type: 'clearChat' });
    }
    _setWebviewMessageListener() {
        this._webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'userMessage':
                    await this._handleUserMessage(message.content, message.isVoice);
                    break;
                case 'requestFileContent':
                    await this._handleFileContentRequest(message.filePath);
                    break;
                case 'writeFile':
                    await this._handleWriteFile(message.filePath, message.content);
                    break;
                case 'executeCommand':
                    await this._handleExecuteCommand(message.command);
                    break;
                case 'getWorkspaceInfo':
                    await this._handleGetWorkspaceInfo();
                    break;
                case 'saveSession':
                    this._sessionManager.saveSession(message.session);
                    break;
                case 'voiceError':
                    vscode.window.showErrorMessage(`Voice error: ${message.error}`);
                    break;
            }
        }, undefined, this._disposables);
    }
    async _handleUserMessage(content, isVoice = false) {
        try {
            // Add user message to session
            this._sessionManager.addMessage('user', content);
            // Show thinking indicator
            this._webview.postMessage({
                type: 'assistantThinking',
                thinking: true
            });
            // Route the intent and get response
            const response = await this._intentRouter.processMessage(content);
            // Add assistant response to session
            this._sessionManager.addMessage('assistant', response.content);
            // Send response to webview
            this._webview.postMessage({
                type: 'assistantMessage',
                content: response.content,
                actions: response.actions,
                thinking: false
            });
        }
        catch (error) {
            console.error('Error handling user message:', error);
            this._webview.postMessage({
                type: 'assistantMessage',
                content: 'I apologize, but I encountered an error processing your request. Please check your OpenAI API key in the extension settings.',
                thinking: false,
                error: true
            });
        }
    }
    async _handleFileContentRequest(filePath) {
        try {
            const content = await this._fileSystemService.readFile(filePath);
            this._webview.postMessage({
                type: 'fileContent',
                filePath,
                content
            });
        }
        catch (error) {
            this._webview.postMessage({
                type: 'fileContent',
                filePath,
                content: null,
                error: `Failed to read file: ${error}`
            });
        }
    }
    async _handleWriteFile(filePath, content) {
        try {
            await this._fileSystemService.writeFile(filePath, content);
            this._webview.postMessage({
                type: 'fileWritten',
                filePath,
                success: true
            });
            vscode.window.showInformationMessage(`File written: ${filePath}`);
        }
        catch (error) {
            this._webview.postMessage({
                type: 'fileWritten',
                filePath,
                success: false,
                error: `Failed to write file: ${error}`
            });
        }
    }
    async _handleExecuteCommand(command) {
        try {
            await vscode.commands.executeCommand(command);
            this._webview.postMessage({
                type: 'commandExecuted',
                command,
                success: true
            });
        }
        catch (error) {
            this._webview.postMessage({
                type: 'commandExecuted',
                command,
                success: false,
                error: `Failed to execute command: ${error}`
            });
        }
    }
    async _handleGetWorkspaceInfo() {
        const workspaceInfo = await this._fileSystemService.getWorkspaceInfo();
        this._webview.postMessage({
            type: 'workspaceInfo',
            info: workspaceInfo
        });
    }
    _loadSessionHistory() {
        const session = this._sessionManager.getSession();
        this._webview.postMessage({
            type: 'loadSession',
            session
        });
    }
    _getHtmlForWebview() {
        const scriptUri = this._webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js'));
        const styleUri = this._webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
        // Get configuration
        const config = vscode.workspace.getConfiguration('autonomousdev');
        const voiceEnabled = config.get('voiceEnabled', true);
        const autoSpeak = config.get('autoSpeak', true);
        const voiceSpeed = config.get('voiceSpeed', 1.0);
        const voicePitch = config.get('voicePitch', 1.0);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._webview.cspSource} 'unsafe-inline'; script-src ${this._webview.cspSource} 'unsafe-inline';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Autonomous Dev Assistant</title>
</head>
<body>
    <div id="app">
        <div id="chat-container">
            <div id="messages"></div>
            <div id="input-container">
                <div id="input-wrapper">
                    <textarea id="user-input" placeholder="Ask me anything about your code..." rows="1"></textarea>
                    <button id="voice-button" class="voice-btn ${voiceEnabled ? 'enabled' : 'disabled'}" title="Toggle voice input">
                        <span class="voice-icon">🎤</span>
                    </button>
                    <button id="send-button" class="send-btn" title="Send message">
                        <span class="send-icon">📤</span>
                    </button>
                </div>
                <div id="voice-status" class="voice-status hidden">
                    <span class="pulse"></span>
                    <span class="status-text">Listening...</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Configuration from VS Code settings
        window.chatConfig = {
            voiceEnabled: ${voiceEnabled},
            autoSpeak: ${autoSpeak},
            voiceSpeed: ${voiceSpeed},
            voicePitch: ${voicePitch}
        };
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}
exports.ChatPanel = ChatPanel;
ChatPanel.viewType = 'autonomousdev.chat';
//# sourceMappingURL=chatPanel.js.map