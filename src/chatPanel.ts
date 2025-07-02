/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { BackendService } from './services/backendService';
import { FileSystemService } from './services/fileSystemService';
import { IntentRouter } from './services/intentRouter';
import { SessionManager } from './services/sessionManager';

export class ChatPanel {
	public static readonly viewType = 'autonomousdev.chat';
	private readonly _panel?: vscode.WebviewPanel;
	private readonly _webview: vscode.Webview;
	private _disposables: vscode.Disposable[] = [];
	private _isVoiceEnabled = true;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _sessionManager: SessionManager,
		private readonly _backendService: BackendService,
		private readonly _fileSystemService: FileSystemService,
		private readonly _intentRouter: IntentRouter,
		webview?: vscode.Webview
	) {
		if (webview) {
			// Using existing webview (for activity bar view)
			this._webview = webview;
		} else {
			// Create new panel (for standalone chat)
			this._panel = vscode.window.createWebviewPanel(
				ChatPanel.viewType,
				'🧠 Digital Intelligence Assistant',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.joinPath(this._extensionUri, 'media'),
						vscode.Uri.joinPath(this._extensionUri, 'out', 'media')
					]
				}
			);
			this._webview = this._panel.webview;

			this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		}

		this._webview.html = this._getHtmlForWebview();
		this._setWebviewMessageListener();

		// Load session history and initialize backend connection
		this._initializeChat();
	}

	public reveal() {
		if (this._panel) {
			this._panel.reveal();
		}
	}

	public dispose() {
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

	public onDidDispose(callback: () => void) {
		if (this._panel) {
			this._panel.onDidDispose(callback);
		}
	}

	public toggleVoice() {
		this._isVoiceEnabled = !this._isVoiceEnabled;
		this._webview.postMessage({
			type: 'toggleVoice',
			enabled: this._isVoiceEnabled
		});

		vscode.window.showInformationMessage(
			`Voice ${this._isVoiceEnabled ? 'enabled' : 'disabled'}`
		);
	}

	public clearChat() {
		this._webview.postMessage({ type: 'clearChat' });
	}

	/**
	 * Initialize chat with backend connection and session history
	 */
	private async _initializeChat() {
		try {
			// Check backend health
			const isBackendHealthy = await this._backendService.checkHealth();

			// Show backend status
			this._webview.postMessage({
				type: 'backendStatus',
				connected: isBackendHealthy,
				message: isBackendHealthy
					? 'Connected to Digital Intelligence Backend'
					: 'Backend unavailable - using limited mode'
			});

			// Load session history
			this._loadSessionHistory();

		} catch (error) {
			console.error('Failed to initialize chat:', error);
			this._webview.postMessage({
				type: 'backendStatus',
				connected: false,
				message: 'Failed to connect to backend'
			});
		}
	}

	private _setWebviewMessageListener() {
		this._webview.onDidReceiveMessage(
			async (message) => {
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
					case 'checkBackendHealth':
						await this._handleBackendHealthCheck();
						break;
					case 'getSessionInfo':
						await this._handleGetSessionInfo();
						break;
				}
			},
			undefined,
			this._disposables
		);
	}

	private async _handleUserMessage(content: string, isVoice: boolean = false) {
		try {
			// Add user message to session
			this._sessionManager.addMessage('user', content);

			// Show user message in UI
			this._webview.postMessage({
				type: 'userMessage',
				content,
				timestamp: Date.now()
			});

			// Show thinking indicator
			this._webview.postMessage({
				type: 'assistantThinking',
				thinking: true
			});

			// Route the intent and get response (now uses backend)
			const response = await this._intentRouter.processMessage(content, isVoice);

			// Add assistant response to session
			this._sessionManager.addMessage('assistant', response.content);

			// Send response to webview
			this._webview.postMessage({
				type: 'assistantMessage',
				content: response.content,
				actions: response.actions,
				confidence: response.confidence,
				thinking: false,
				timestamp: Date.now()
			});

		} catch (error) {
			console.error('Error handling user message:', error);

			this._webview.postMessage({
				type: 'assistantMessage',
				content: 'I apologize, but I encountered an error processing your request. Please ensure the Digital Intelligence backend is running and accessible.',
				thinking: false,
				error: true,
				timestamp: Date.now()
			});
		}
	}

	private async _handleFileContentRequest(filePath: string) {
		try {
			const content = await this._fileSystemService.readFile(filePath);
			this._webview.postMessage({
				type: 'fileContent',
				filePath,
				content
			});
		} catch (error) {
			this._webview.postMessage({
				type: 'fileContent',
				filePath,
				content: null,
				error: `Failed to read file: ${error}`
			});
		}
	}

	private async _handleWriteFile(filePath: string, content: string) {
		try {
			await this._fileSystemService.writeFile(filePath, content);
			this._webview.postMessage({
				type: 'fileWritten',
				filePath,
				success: true
			});

			vscode.window.showInformationMessage(`File written: ${filePath}`);
		} catch (error) {
			this._webview.postMessage({
				type: 'fileWritten',
				filePath,
				success: false,
				error: `Failed to write file: ${error}`
			});
		}
	}

	private async _handleExecuteCommand(command: string) {
		try {
			await vscode.commands.executeCommand(command);
			this._webview.postMessage({
				type: 'commandExecuted',
				command,
				success: true
			});
		} catch (error) {
			this._webview.postMessage({
				type: 'commandExecuted',
				command,
				success: false,
				error: `Failed to execute command: ${error}`
			});
		}
	}

	private async _handleGetWorkspaceInfo() {
		const workspaceInfo = await this._fileSystemService.getWorkspaceInfo();
		this._webview.postMessage({
			type: 'workspaceInfo',
			info: workspaceInfo
		});
	}

	/**
	 * Handle backend health check request from UI
	 */
	private async _handleBackendHealthCheck() {
		try {
			const isHealthy = await this._backendService.checkHealth();
			this._webview.postMessage({
				type: 'backendStatus',
				connected: isHealthy,
				message: isHealthy
					? '✅ Digital Intelligence Backend is healthy'
					: '❌ Backend is not responding'
			});
		} catch (error) {
			this._webview.postMessage({
				type: 'backendStatus',
				connected: false,
				message: '❌ Failed to check backend health'
			});
		}
	}

	/**
	 * Handle session info request from UI
	 */
	private async _handleGetSessionInfo() {
		try {
			const session = this._backendService.getCurrentSession();
			this._webview.postMessage({
				type: 'sessionInfo',
				session: session ? {
					sessionId: session.sessionId,
					userId: session.userId,
					messageCount: session.messages.length,
					workspaceName: session.workspaceInfo?.name,
					platform: session.platform
				} : null
			});
		} catch (error) {
			console.error('Failed to get session info:', error);
		}
	}

	private async _loadSessionHistory() {
		try {
			// Get session from backend
			const conversationHistory = await this._intentRouter.getConversationHistory();

			// Also get local session for fallback
			const localSession = this._sessionManager.getSession();

			this._webview.postMessage({
				type: 'loadSession',
				session: localSession,
				backendHistory: conversationHistory
			});
		} catch (error) {
			console.error('Failed to load session history:', error);
			// Fallback to local session only
			const localSession = this._sessionManager.getSession();
			this._webview.postMessage({
				type: 'loadSession',
				session: localSession,
				backendHistory: []
			});
		}
	}

	private _getHtmlForWebview(): string {
		const scriptUri = this._webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
		);
		const styleUri = this._webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css')
		);

		// Get configuration
		const config = vscode.workspace.getConfiguration('autonomousdev');
		const voiceEnabled = config.get('voiceEnabled', true);
		const autoSpeak = config.get('autoSpeak', true);
		const voiceSpeed = config.get('voiceSpeed', 1.0);
		const voicePitch = config.get('voicePitch', 1.0);
		const backendUrl = config.get('backendUrl', 'http://localhost:3001');

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._webview.cspSource} 'unsafe-inline'; script-src ${this._webview.cspSource} 'unsafe-inline';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Digital Intelligence Assistant</title>
</head>
<body>
    <div id="app">
        <div id="header">
            <div id="status-bar">
                <div id="backend-status" class="status-indicator">
                    <span class="status-dot"></span>
                    <span class="status-text">Connecting...</span>
                </div>
                <div id="session-info" class="session-indicator" title="Session information">
                    <span class="session-icon">🧠</span>
                </div>
            </div>
        </div>

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
            voicePitch: ${voicePitch},
            backendUrl: '${backendUrl}'
        };
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
	}
}
