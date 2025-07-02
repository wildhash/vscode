/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ChatPanel } from './chatPanel';
import { OpenAIService } from './services/openaiService';
import { FileSystemService } from './services/fileSystemService';
import { IntentRouter } from './services/intentRouter';
import { SessionManager } from './services/sessionManager';

let chatPanel: ChatPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Autonomous Dev Assistant is now active!');

    // Initialize services
    const sessionManager = new SessionManager(context);
    const openaiService = new OpenAIService();
    const fileSystemService = new FileSystemService();
    const intentRouter = new IntentRouter(fileSystemService, openaiService);

    // Register commands
    const openChatCommand = vscode.commands.registerCommand('autonomousdev.openChat', () => {
        if (chatPanel) {
            chatPanel.reveal();
        } else {
            chatPanel = new ChatPanel(
                context.extensionUri,
                sessionManager,
                openaiService,
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
            sessionManager.clearHistory();
            if (chatPanel) {
                chatPanel.clearChat();
            }
            vscode.window.showInformationMessage('Chat history cleared.');
        }
    });

    // Register view provider for the activity bar
    const provider = new ChatViewProvider(
        context.extensionUri,
        sessionManager,
        openaiService,
        fileSystemService,
        intentRouter
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('autonomousdev.chatView', provider),
        openChatCommand,
        toggleVoiceCommand,
        clearHistoryCommand
    );

    // Auto-open on startup if configured
    const config = vscode.workspace.getConfiguration('autonomousdev');
    if (config.get('autoOpen', false)) {
        vscode.commands.executeCommand('autonomousdev.openChat');
    }
}

class ChatViewProvider implements vscode.WebviewViewProvider {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly sessionManager: SessionManager,
        private readonly openaiService: OpenAIService,
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
            this.openaiService,
            this.fileSystemService,
            this.intentRouter,
            webviewView.webview
        );
    }
}

export function deactivate() {
    if (chatPanel) {
        chatPanel.dispose();
    }
}
