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
import { AutonomousAgentService } from './services/autonomousAgentService';
import { TestDrivenService } from './services/testDrivenService';
import { DeploymentService } from './services/deploymentService';
import { HumanInterventionHandler } from './services/humanInterventionHandler';

let chatPanel: ChatPanel | undefined;
let autonomousAgent: AutonomousAgentService | undefined;
let interventionHandler: HumanInterventionHandler | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Autonomous Dev Assistant is now active!');

    // Initialize core services
    const sessionManager = new SessionManager(context);
    const openaiService = new OpenAIService();
    const fileSystemService = new FileSystemService();
    const intentRouter = new IntentRouter(fileSystemService, openaiService);

    // Initialize autonomous development services
    const testService = new TestDrivenService(openaiService, fileSystemService);
    const deploymentService = new DeploymentService(fileSystemService);
    interventionHandler = new HumanInterventionHandler();

    // Initialize the autonomous agent
    autonomousAgent = new AutonomousAgentService(
        openaiService,
        fileSystemService,
        testService,
        deploymentService,
        interventionHandler
    );

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

    // Autonomous mode commands
    const toggleAutonomousCommand = vscode.commands.registerCommand('autonomousdev.toggleAutonomous', async () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }

        if (autonomousAgent.isActive) {
            autonomousAgent.stop();
            vscode.window.showInformationMessage('🛑 Autonomous mode OFF');
        } else {
            await autonomousAgent.start();
            vscode.window.showInformationMessage('🧠 Autonomous mode ON - AI is now working autonomously');
        }
    });

    const startTaskCommand = vscode.commands.registerCommand('autonomousdev.startTask', async () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }

        const taskDescription = await vscode.window.showInputBox({
            prompt: 'Describe the task you want the AI to complete',
            placeHolder: 'e.g., Create a REST API endpoint for user authentication',
            validateInput: (value) => {
                if (!value || value.trim().length < 10) {
                    return 'Please provide a more detailed task description (at least 10 characters)';
                }
                return undefined;
            }
        });

        if (taskDescription) {
            await autonomousAgent.startTask(taskDescription);
        }
    });

    const continueTaskCommand = vscode.commands.registerCommand('autonomousdev.continueTask', async () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }

        await autonomousAgent.continueTask();
    });

    const abortTaskCommand = vscode.commands.registerCommand('autonomousdev.abortTask', () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }

        autonomousAgent.abortTask();
    });

    const showInterventionsCommand = vscode.commands.registerCommand('autonomousdev.showInterventions', () => {
        if (!interventionHandler) {
            vscode.window.showErrorMessage('Intervention handler not initialized');
            return;
        }

        interventionHandler.showInterventionsPanel();
    });

    // Test-driven development commands
    const runTestsCommand = vscode.commands.registerCommand('autonomousdev.runTests', async () => {
        const result = await testService.runTests();
        if (result.status === 'passed') {
            vscode.window.showInformationMessage(`✅ All ${result.passedCount} tests passed!`);
        } else {
            vscode.window.showWarningMessage(`❌ ${result.failedCount} tests failed`);
        }
    });

    const writeTestsCommand = vscode.commands.registerCommand('autonomousdev.writeTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Please open a file to generate tests for');
            return;
        }

        const result = await testService.writeTestsForFile(editor.document.fileName);
        if (result.success) {
            vscode.window.showInformationMessage(`📝 Test file created: ${result.testFile}`);
        } else {
            vscode.window.showErrorMessage(`Failed to generate tests: ${result.error}`);
        }
    });

    // Deployment commands
    const buildCommand = vscode.commands.registerCommand('autonomousdev.build', async () => {
        const result = await deploymentService.build();
        if (result.success) {
            vscode.window.showInformationMessage('✅ Build successful!');
        } else {
            vscode.window.showErrorMessage(`❌ Build failed: ${result.error}`);
        }
    });

    const deployCommand = vscode.commands.registerCommand('autonomousdev.deploy', async () => {
        const confirm = await vscode.window.showWarningMessage(
            'Are you sure you want to deploy to production?',
            'Deploy',
            'Cancel'
        );

        if (confirm === 'Deploy') {
            const result = await deploymentService.deploy();
            if (result.success) {
                vscode.window.showInformationMessage(`🚀 Deployed successfully to ${result.url || 'production'}!`);
            } else {
                vscode.window.showErrorMessage(`❌ Deployment failed: ${result.error}`);
            }
        }
    });

    const setupDeploymentCommand = vscode.commands.registerCommand('autonomousdev.setupDeployment', async () => {
        const platform = await vscode.window.showQuickPick(
            [
                { label: 'Vercel', description: 'Deploy to Vercel', value: 'vercel' as const },
                { label: 'Netlify', description: 'Deploy to Netlify', value: 'netlify' as const },
                { label: 'GitHub Pages', description: 'Deploy to GitHub Pages', value: 'github-pages' as const },
                { label: 'Fly.io', description: 'Deploy to Fly.io', value: 'fly' as const },
            ],
            { placeHolder: 'Select deployment platform' }
        );

        if (platform) {
            const success = await deploymentService.createDeploymentConfig(platform.value);
            if (success) {
                vscode.window.showInformationMessage(`✅ ${platform.label} configuration created!`);
            }
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
        clearHistoryCommand,
        toggleAutonomousCommand,
        startTaskCommand,
        continueTaskCommand,
        abortTaskCommand,
        showInterventionsCommand,
        runTestsCommand,
        writeTestsCommand,
        buildCommand,
        deployCommand,
        setupDeploymentCommand
    );

    // Auto-start autonomous mode if configured
    const config = vscode.workspace.getConfiguration('autonomousdev');
    if (config.get('autoStartAutonomous', false)) {
        autonomousAgent.start();
        vscode.window.showInformationMessage('🧠 Autonomous mode auto-started');
    }

    // Auto-open chat on startup if configured
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
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        // Create a mini chat panel for the activity bar
        new ChatPanel(
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
    if (autonomousAgent) {
        autonomousAgent.stop();
    }
    if (interventionHandler) {
        interventionHandler.dispose();
    }
}
