/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';
import { BackendService } from './services/backendService';
import { FileSystemService } from './services/fileSystemService';
import { IntentRouter } from './services/intentRouter';
import { SessionManager } from './services/sessionManager';

let chatPanel: ChatPanel | undefined;
let backendService: BackendService;

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Autonomous Dev Assistant is now active!');

    // Initialize services
    const sessionManager = new SessionManager(context);
    backendService = new BackendService();
    const fileSystemService = new FileSystemService();
    const intentRouter = new IntentRouter(fileSystemService, backendService);

    // Check backend health on startup
    checkBackendHealth();

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('autonomousdev.openChat', () => {
        if (chatPanel) {
            chatPanel.reveal();
        } else {
            chatPanel = new ChatPanel(
                context.extensionUri,
                sessionManager,
                backendService,
                fileSystemService,
                intentRouter
            );

            chatPanel.onDidDispose(() => {
                chatPanel = undefined;
            });
        }
    });

    const toggleVoiceCommand = vscode.commands.registerCommand('autonomousdev.toggleVoice', () => {
        if (chatPanel) {
            chatPanel.toggleVoice();
        } else {
            vscode.window.showInformationMessage('Please open the Voice Assistant first.');
        }
    });

    const clearHistoryCommand = vscode.commands.registerCommand('autonomousdev.clearHistory', async () => {
        const result = await vscode.window.showWarningMessage(
            'Are you sure you want to clear all chat history?',
            'Yes',
            'No'
        );

        if (result === 'Yes') {
            try {
                await intentRouter.clearConversationHistory();
                sessionManager.clearHistory();
                if (chatPanel) {
                    chatPanel.clearChat();
                }
                vscode.window.showInformationMessage('Chat history cleared.');
            } catch (error) {
                vscode.window.showErrorMessage('Failed to clear chat history.');
                console.error('Error clearing history:', error);
            }
        }
    });

    // New command to check backend status
    const checkBackendCommand = vscode.commands.registerCommand('autonomousdev.checkBackend', async () => {
        const isHealthy = await backendService.checkHealth();
        const message = isHealthy
            ? '✅ Digital Intelligence Backend is healthy and connected!'
            : '❌ Backend is unavailable. Please ensure the backend is running.';

        vscode.window.showInformationMessage(message);
    });

    // New command to show session info
    const showSessionCommand = vscode.commands.registerCommand('autonomousdev.showSession', async () => {
        const session = backendService.getCurrentSession();
        if (session) {
            const info = `Session: ${session.sessionId}\nUser: ${session.userId}\nMessages: ${session.messages.length}\nWorkspace: ${session.workspaceInfo?.name || 'None'}`;
            vscode.window.showInformationMessage(info);
        } else {
            vscode.window.showInformationMessage('No active session. Start a conversation to create one.');
        }
    });

    // Register view provider for the activity bar
    const provider = new ChatViewProvider(
        context.extensionUri,
        sessionManager,
        backendService,
        fileSystemService,
        intentRouter
    );

    // Listen for workspace changes to update context
    const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        await intentRouter.updateSessionContext();
    });

    // Listen for active editor changes
    const editorWatcher = vscode.window.onDidChangeActiveTextEditor(async () => {
        await intentRouter.updateSessionContext();
    });

    // Listen for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('autonomousdev.backendUrl')) {
            vscode.window.showInformationMessage(
                'Backend URL changed. Please restart VS Code for changes to take effect.',
                'Restart Now'
            ).then(selection => {
                if (selection === 'Restart Now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    });

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('autonomousdev.chatView', provider),
        openChatCommand,
        toggleVoiceCommand,
        clearHistoryCommand,
        checkBackendCommand,
        showSessionCommand,
        workspaceWatcher,
        editorWatcher,
        configWatcher
    );

    // Show welcome message with backend status
    showWelcomeMessage();
}

class ChatViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly sessionManager: SessionManager,
        private readonly backendService: BackendService,
        private readonly fileSystemService: FileSystemService,
        private readonly intentRouter: IntentRouter
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        // Create a mini chat panel for the activity bar
        const miniChatPanel = new ChatPanel(
            this.extensionUri,
            this.sessionManager,
            this.backendService,
            this.fileSystemService,
            this.intentRouter,
            webviewView.webview
        );
    }
}

/**
 * Check backend health and show status
 */
async function checkBackendHealth(): Promise<void> {
    try {
        const isHealthy = await backendService.checkHealth();

        if (isHealthy) {
            console.log('✅ Digital Intelligence Backend connected successfully');
        } else {
            console.warn('⚠️ Digital Intelligence Backend is not available');
            showBackendSetupMessage();
        }
    } catch (error) {
        console.error('❌ Failed to check backend health:', error);
        showBackendSetupMessage();
    }
}

/**
 * Show setup message for backend
 */
function showBackendSetupMessage(): void {
    const config = vscode.workspace.getConfiguration('autonomousdev');
    const backendUrl = config.get('backendUrl', 'http://localhost:3001');

    vscode.window.showWarningMessage(
        `Digital Intelligence Backend not available at ${backendUrl}`,
        'Setup Instructions',
        'Open Settings'
    ).then(selection => {
        if (selection === 'Setup Instructions') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo#setup'));
        } else if (selection === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'autonomousdev.backendUrl');
        }
    });
}

/**
 * Show welcome message on activation
 */
async function showWelcomeMessage(): Promise<void> {
    const config = vscode.workspace.getConfiguration('autonomousdev');
    const hasShownWelcome = config.get('hasShownWelcome', false);

    if (!hasShownWelcome) {
        const result = await vscode.window.showInformationMessage(
            '🧠 Welcome to Digital Intelligence! Your autonomous coding assistant is ready.',
            'Open Voice Assistant',
            'Learn More',
            "Don't Show Again"
        );

        if (result === 'Open Voice Assistant') {
            vscode.commands.executeCommand('autonomousdev.openChat');
        } else if (result === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo#features'));
        } else if (result === "Don't Show Again") {
            config.update('hasShownWelcome', true, vscode.ConfigurationTarget.Global);
        }
    }
}

export function deactivate() {
    if (chatPanel) {
        chatPanel.dispose();
    }

    // Clean up backend session
    if (backendService) {
        backendService.endSession().catch(console.error);
    }

    console.log('👋 Autonomous Dev Assistant deactivated');
}
